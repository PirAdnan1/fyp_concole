import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, capacity } = await req.json();
  const room = await prisma.defenceRoom.update({
    where: { id: params.id },
    data: {
      name: name || undefined,
      capacity: capacity !== undefined ? Number(capacity) : undefined,
    },
  });
  return NextResponse.json(room);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.defenceRoom.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
