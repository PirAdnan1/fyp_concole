import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Requirement 23-25: assign internal examiner, external examiner, date and
// time to a room. If the parent schedule was already finalized, the previous
// values are preserved in the audit log before being overwritten (Req. 25).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { roomAllocationId, internalExaminerId, externalExaminerId, date, startTime, endTime } = body;

    if (!roomAllocationId) {
      return NextResponse.json({ error: "roomAllocationId is required." }, { status: 400 });
    }

    const existing = await prisma.roomAllocation.findUnique({
      where: { id: roomAllocationId },
      include: { defenceSchedule: true },
    });
    if (!existing) return NextResponse.json({ error: "Room allocation not found." }, { status: 404 });

    if (existing.defenceSchedule.status === "Finalized") {
      await prisma.auditLog.create({
        data: {
          entityType: "RoomAllocation",
          entityId: existing.id,
          action: "UPDATE",
          oldValue: {
            internalExaminerId: existing.internalExaminerId,
            externalExaminerId: existing.externalExaminerId,
            date: existing.date,
            startTime: existing.startTime,
            endTime: existing.endTime,
          },
          newValue: { internalExaminerId, externalExaminerId, date, startTime, endTime },
        },
      });
    }

    const updated = await prisma.roomAllocation.update({
      where: { id: roomAllocationId },
      data: {
        internalExaminerId: internalExaminerId || undefined,
        externalExaminerId: externalExaminerId || undefined,
        date: date ? new Date(date) : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Assignment failed." }, { status: 500 });
  }
}
