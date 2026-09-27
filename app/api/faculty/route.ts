import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const isExternal = req.nextUrl.searchParams.get("isExternal");
  const faculty = await prisma.faculty.findMany({
    where: isExternal !== null ? { isExternal: isExternal === "true" } : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(faculty);
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, isExternal, department } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    const faculty = await prisma.faculty.create({
      data: { name, email, isExternal: !!isExternal, department },
    });
    return NextResponse.json(faculty, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A person with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message ?? "Could not create faculty record." }, { status: 500 });
  }
}
