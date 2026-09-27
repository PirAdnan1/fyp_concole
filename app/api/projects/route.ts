import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Requirement 24: projects only need student/group/title/main supervisor to exist.
// This endpoint also flags which projects are not yet allocated to a defence room,
// so the Coordinator can pick unscheduled projects for a new defence session.
export async function GET(req: NextRequest) {
  const fypType = req.nextUrl.searchParams.get("fypType") ?? undefined;
  const unallocatedOnly = req.nextUrl.searchParams.get("unallocatedOnly") === "true";

  const projects = await prisma.project.findMany({
    where: fypType ? { fypType } : undefined,
    include: {
      group: { include: { students: true } },
      supervisor: true,
      allocations: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const filtered = unallocatedOnly ? projects.filter((p: (typeof projects)[number]) => p.allocations.length === 0) : projects;

  return NextResponse.json(filtered);
}
