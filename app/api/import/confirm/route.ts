import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Commits a previously-previewed batch: creates/updates students, auto-creates
// groups where group info is present, and links projects + main supervisor.
// DUPLICATE and INVALID rows are always skipped. (Requirement 21.6, 21.10-13)
export async function POST(req: NextRequest) {
  try {
    const { batchId } = (await req.json()) as { batchId: string };
    if (!batchId) return NextResponse.json({ error: "batchId is required." }, { status: 400 });

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { records: true },
    });
    if (!batch) return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
    if (batch.status === "Confirmed") {
      return NextResponse.json({ error: "This batch has already been imported." }, { status: 409 });
    }

    let successCount = 0;
    let updatedCount = 0;
    const failedRows: number[] = [];

    for (const record of batch.records) {
      if (record.status === "DUPLICATE" || record.status === "INVALID") continue;

      const data = record.rawData as Record<string, string>;

      try {
        // 1. Group (auto-created if group info is present)
        let groupId: string | undefined;
        if (data.groupNumber) {
          const group = await prisma.group.upsert({
            where: { groupNumber: data.groupNumber },
            update: { fypType: data.fypType || undefined },
            create: {
              groupNumber: data.groupNumber,
              fypType: data.fypType || "FYP-1",
            },
          });
          groupId = group.id;
        }

        // 2. Student (create or update, matched by Student ID)
        await prisma.student.upsert({
          where: { studentId: data.studentId },
          update: {
            name: data.name || undefined,
            email: data.email || undefined,
            contactNumber: data.contactNumber || undefined,
            program: data.program || undefined,
            semester: data.semester || undefined,
            feeStatus: data.feeStatus || undefined,
            groupId,
          },
          create: {
            studentId: data.studentId,
            name: data.name,
            email: data.email || null,
            contactNumber: data.contactNumber || null,
            program: data.program || null,
            semester: data.semester || null,
            feeStatus: data.feeStatus || "Pending",
            groupId,
          },
        });

        // 3. Supervisor (find-or-create by name, if supplied — Requirement 24)
        let supervisorId: string | undefined;
        if (data.supervisor) {
          const supervisor = await prisma.faculty.upsert({
            where: { email: `${data.supervisor.toLowerCase().replace(/\s+/g, ".")}@placeholder.local` },
            update: {},
            create: {
              name: data.supervisor,
              email: `${data.supervisor.toLowerCase().replace(/\s+/g, ".")}@placeholder.local`,
            },
          });
          supervisorId = supervisor.id;
        }

        // 4. Project (only if a group + project title exist; examiners intentionally omitted)
        if (groupId && data.projectTitle) {
          await prisma.project.upsert({
            where: { groupId },
            update: {
              title: data.projectTitle,
              description: data.projectDescription || undefined,
              supervisorId,
            },
            create: {
              groupId,
              title: data.projectTitle,
              description: data.projectDescription || null,
              fypType: data.fypType || "FYP-1",
              supervisorId,
            },
          });
        }

        if (record.status === "NEW") successCount++;
        else if (record.status === "EXISTING") updatedCount++;
      } catch (e) {
        failedRows.push(record.rowNumber);
      }
    }

    const duplicateCount = batch.records.filter((r: (typeof batch.records)[number]) => r.status === "DUPLICATE").length;
    const failedCount = batch.records.filter((r: (typeof batch.records)[number]) => r.status === "INVALID").length + failedRows.length;

    const updated = await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: "Confirmed", successCount, updatedCount, duplicateCount, failedCount },
    });

    return NextResponse.json({
      summary: {
        total: batch.totalRecords,
        imported: successCount,
        updated: updatedCount,
        duplicates: duplicateCount,
        failed: failedCount,
      },
      batch: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Import confirmation failed." }, { status: 500 });
  }
}
