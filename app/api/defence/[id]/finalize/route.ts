import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectConflicts } from "@/lib/scheduling";

// Requirement 25: once finalized, the system maintains the final defence
// record and preserves prior assignments in the audit history on any
// later change. We block finalization while unresolved conflicts remain.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const conflicts = await detectConflicts(params.id);
  if (conflicts.length > 0) {
    return NextResponse.json(
      { error: "Cannot finalize: unresolved conflicts remain.", conflicts },
      { status: 409 }
    );
  }

  const schedule = await prisma.defenceSchedule.update({
    where: { id: params.id },
    data: { status: "Finalized" },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "DefenceSchedule",
      entityId: schedule.id,
      action: "FINALIZE",
      newValue: { status: "Finalized" },
    },
  });

  return NextResponse.json(schedule);
}
