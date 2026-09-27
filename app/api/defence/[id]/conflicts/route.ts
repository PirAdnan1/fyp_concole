import { NextRequest, NextResponse } from "next/server";
import { detectConflicts } from "@/lib/scheduling";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const conflicts = await detectConflicts(params.id);
  return NextResponse.json({ conflicts, count: conflicts.length });
}
