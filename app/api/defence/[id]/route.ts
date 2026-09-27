import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const schedule = await prisma.defenceSchedule.findUnique({
    where: { id: params.id },
    include: {
      roomAllocations: {
        include: {
          room: true,
          internalExaminer: true,
          externalExaminer: true,
          projects: { include: { project: { include: { group: true, supervisor: true } } } },
          committee: { include: { faculty: true } },
        },
        orderBy: { room: { name: "asc" } },
      },
    },
  });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(schedule);
}
