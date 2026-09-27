import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Downloadable CSV of failed/invalid rows (Requirement 21.13).
export async function GET(req: NextRequest, { params }: { params: { batchId: string } }) {
  const records = await prisma.importRecord.findMany({
    where: { batchId: params.batchId, status: "INVALID" },
    orderBy: { rowNumber: "asc" },
  });

  const header = ["Row", "Student ID", "Name", "Errors"];
  const lines = records.map((r: (typeof records)[number]) => {
    const raw = r.rawData as Record<string, string>;
    const errors = ((r.errors as string[] | null) ?? []).join("; ");
    return [r.rowNumber, r.studentId ?? "", raw?.name ?? "", errors]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="import-errors-${params.batchId}.csv"`,
    },
  });
}
