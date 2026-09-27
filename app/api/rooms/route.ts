import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rooms = await prisma.defenceRoom.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(rooms);
}

// Requirement 22: Coordinator creates rooms with a configurable capacity (default 15).
export async function POST(req: NextRequest) {
  try {
    const { name, capacity } = await req.json();
    if (!name) return NextResponse.json({ error: "Room name is required." }, { status: 400 });

    const room = await prisma.defenceRoom.create({
      data: { name, capacity: capacity ? Number(capacity) : 15 },
    });
    return NextResponse.json(room, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A room with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message ?? "Could not create room." }, { status: 500 });
  }
}
