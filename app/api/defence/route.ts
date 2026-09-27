import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const schedules = await prisma.defenceSchedule.findMany({
    orderBy: { createdAt: "desc" },
    include: { roomAllocations: { include: { room: true, projects: true } } },
  });
  return NextResponse.json(schedules);
}

// Requirement 25, step 1: Select FYP Session -> Select FYP Type -> Create Defence Session
export async function POST(req: NextRequest) {
  try {
    const { title, fypType, session } = await req.json();
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

    const schedule = await prisma.defenceSchedule.create({
      data: { title, fypType: fypType || "FYP-1", session },
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not create defence schedule." }, { status: 500 });
  }
}
