import { prisma } from "@/lib/prisma";

// The system fields a CSV column can be mapped to (Requirement 21).
export const SYSTEM_FIELDS = [
  { key: "studentId", label: "Student ID", required: true },
  { key: "name", label: "Student Name", required: true },
  { key: "email", label: "Email", required: false },
  { key: "contactNumber", label: "Contact Number", required: false },
  { key: "program", label: "Program", required: false },
  { key: "semester", label: "Semester", required: false },
  { key: "fypType", label: "FYP Type", required: false },
  { key: "groupNumber", label: "Group Number", required: false },
  { key: "groupMembers", label: "Group Members", required: false },
  { key: "projectTitle", label: "Project Title", required: false },
  { key: "projectDescription", label: "Project Description", required: false },
  { key: "supervisor", label: "Supervisor", required: false },
  { key: "feeStatus", label: "Fee Status", required: false },
] as const;

export type SystemFieldKey = (typeof SYSTEM_FIELDS)[number]["key"];
export type ColumnMapping = Partial<Record<SystemFieldKey, string>>;

export interface PreviewRow {
  rowNumber: number;
  status: "NEW" | "EXISTING" | "DUPLICATE" | "INVALID";
  studentId: string | null;
  mapped: Record<string, string>;
  errors: string[];
}

/** Applies the column mapping to raw CSV rows and produces a mapped record per row. */
function applyMapping(rawRows: Record<string, string>[], mapping: ColumnMapping) {
  return rawRows.map((raw) => {
    const mapped: Record<string, string> = {};
    for (const field of SYSTEM_FIELDS) {
      const csvColumn = mapping[field.key];
      mapped[field.key] = csvColumn ? (raw[csvColumn] ?? "").trim() : "";
    }
    return mapped;
  });
}

/**
 * Builds the preview classification for an import batch:
 * NEW / EXISTING / DUPLICATE / INVALID, per Requirement 21 (steps 6-9).
 */
export async function buildPreview(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping
): Promise<PreviewRow[]> {
  const mappedRows = applyMapping(rawRows, mapping);

  const existingStudents = await prisma.student.findMany({
    select: { studentId: true },
  });
  const existingIds = new Set(existingStudents.map((s: { studentId: string }) => s.studentId));
  const seenInFile = new Set<string>();

  const results: PreviewRow[] = [];

  mappedRows.forEach((mapped, idx) => {
    const errors: string[] = [];
    const studentId = mapped.studentId || null;

    if (!studentId) errors.push("Missing Student ID");
    if (!mapped.name) errors.push("Missing Student Name");
    if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
      errors.push("Invalid email format");
    }

    let status: PreviewRow["status"];
    if (errors.length > 0) {
      status = "INVALID";
    } else if (seenInFile.has(studentId!)) {
      status = "DUPLICATE"; // duplicate within the same file
    } else if (existingIds.has(studentId!)) {
      status = "EXISTING"; // will be updated
    } else {
      status = "NEW";
    }

    if (studentId && status !== "INVALID") seenInFile.add(studentId);

    results.push({
      rowNumber: idx + 2, // +2: header row + 1-indexing
      status,
      studentId,
      mapped,
      errors,
    });
  });

  return results;
}

/** Converts preview rows back into CSV text for the failed-records error report (Req. 21.13). */
export function buildErrorReportCsv(rows: PreviewRow[]): string {
  const failed = rows.filter((r) => r.status === "INVALID");
  const header = ["Row", "Student ID", "Name", "Errors"];
  const lines = failed.map((r) =>
    [r.rowNumber, r.studentId ?? "", r.mapped.name ?? "", r.errors.join("; ")]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}
