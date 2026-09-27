import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoDistributeProjects } from "@/lib/scheduling";

// Requirement 22 & 27: automatically distribute selected projects among
// selected rooms based on configured capacity. The room's associated
// supervisor is pre-set as the internal examiner where possible (Req. 23),
// but remains editable via the /assign endpoint.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { projectIds, roomIds } = (await req.json()) as { projectIds: string[]; roomIds: string[] };
    if (!projectIds?.length || !roomIds?.length) {
      return NextResponse.json({ error: "Select at least one project and one room." }, { status: 400 });
    }

    const rooms = await prisma.defenceRoom.findMany({ where: { id: { in: roomIds } } });

    // Existing allocations for these rooms within this schedule (to respect prior partial fills)
    const existingAllocations = await prisma.roomAllocation.findMany({
      where: { defenceScheduleId: params.id, roomId: { in: roomIds } },
      include: { projects: true },
    });
    const alreadyAssignedByRoom = new Map(
      existingAllocations.map((a: (typeof existingAllocations)[number]) => [a.roomId, a.projects.length])
    );

    const { plan, overflow } = autoDistributeProjects(
      projectIds,
      rooms.map((r: (typeof rooms)[number]) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        alreadyAssigned: alreadyAssignedByRoom.get(r.id) ?? 0,
      }))
    );

    const results = [];
    for (const room of rooms) {
      const projectsForRoom = plan[room.id];
      if (projectsForRoom.length === 0) continue;

      let allocation = existingAllocations.find((a: (typeof existingAllocations)[number]) => a.roomId === room.id);
      if (!allocation) {
        allocation = await prisma.roomAllocation.create({
          data: { defenceScheduleId: params.id, roomId: room.id },
          include: { projects: true },
        });
      }

      await prisma.projectAllocation.createMany({
        data: projectsForRoom.map((projectId) => ({
          projectId,
          roomAllocationId: allocation!.id,
        })),
        skipDuplicates: true,
      });

      results.push({ roomId: room.id, roomName: room.name, assigned: projectsForRoom.length });
    }

    return NextResponse.json({ results, overflowCount: overflow.length, overflowProjectIds: overflow });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Allocation failed." }, { status: 500 });
  }
}
