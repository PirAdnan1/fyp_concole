import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { buildPreview, ColumnMapping } from "@/lib/csv";

// Accepts raw CSV text + a column mapping, returns a classified preview
// without writing anything permanent except a Pending ImportBatch record
// (so the Coordinator can confirm or cancel it later — Requirement 21.8-10).
export async function POST(req: NextRequest) {
  try {
    const { csvText, mapping, filename } = (await req.json()) as {
      csvText: string;
      mapping: ColumnMapping;
      filename: string;
    };

    if (!csvText) {
      return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
    }

    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: "CSV parsing failed.", details: parsed.errors },
        { status: 400 }
      );
    }

    const preview = await buildPreview(parsed.data, mapping);

    const counts = {
      total: preview.length,
      new: preview.filter((r) => r.status === "NEW").length,
      existing: preview.filter((r) => r.status === "EXISTING").length,
      duplicate: preview.filter((r) => r.status === "DUPLICATE").length,
      invalid: preview.filter((r) => r.status === "INVALID").length,
    };

    const batch = await prisma.importBatch.create({
      data: {
        filename: filename || "upload.csv",
        columnMapping: mapping as any,
        totalRecords: counts.total,
        status: "Pending",
        records: {
          create: preview.map((r) => ({
            rowNumber: r.rowNumber,
            status: r.status,
            studentId: r.studentId,
            rawData: r.mapped,
            errors: r.errors,
          })),
        },
      },
    });

    return NextResponse.json({ batchId: batch.id, counts, preview });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Import preview failed." }, { status: 500 });
  }
}
