import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Requirement 26: room-wise defence dashboard (Room | Projects | Internal |
// External | Date | Time | Status).
export async function GET() {
  const allocations = await prisma.roomAllocation.findMany({
    include: {
      room: true,
      internalExaminer: true,
      externalExaminer: true,
      projects: true,
      defenceSchedule: true,
    },
    orderBy: [{ date: "asc" }, { room: { name: "asc" } }],
  });

  const rows = allocations.map((a: (typeof allocations)[number]) => ({
    id: a.id,
    scheduleTitle: a.defenceSchedule.title,
    room: a.room.name,
    capacity: a.room.capacity,
    projectCount: a.projects.length,
    internal: a.internalExaminer?.name ?? "—",
    external: a.externalExaminer?.name ?? "—",
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
  }));

  return NextResponse.json(rows);
}
