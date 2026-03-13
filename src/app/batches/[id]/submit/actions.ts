"use server";

import { db } from "@/db";
import { auditBatches, auditRecords, carriers, facilities, employeeIdentities } from "@/db/schema";
import { eq, and, ne, isNotNull } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

export interface TerminationRecord {
  employeeName: string;
  facilityName: string;
  classification: string;
  effectiveDate: string;
  notes: string;
}

export async function getSubmissionData(batchId: string) {
  const [batch] = await db
    .select({
      id: auditBatches.id,
      status: auditBatches.status,
      submittedAt: auditBatches.submittedAt,
      carrierName: carriers.name,
      sourceFile: auditBatches.sourceFile,
      periodId: auditBatches.periodId,
    })
    .from(auditBatches)
    .leftJoin(carriers, eq(auditBatches.carrierId, carriers.id))
    .where(eq(auditBatches.id, batchId));

  if (!batch) return null;

  let terminations: TerminationRecord[];

  if (batch.periodId) {
    // Period-aware: join through identities
    const records = await db
      .select({
        employeeName: auditRecords.employeeName,
        facilityName: facilities.name,
        classification: employeeIdentities.classification,
        effectiveDate: employeeIdentities.effectiveDate,
        notes: employeeIdentities.classificationNotes,
      })
      .from(auditRecords)
      .leftJoin(facilities, eq(auditRecords.facilityId, facilities.id))
      .leftJoin(employeeIdentities, eq(auditRecords.identityId, employeeIdentities.id))
      .where(
        and(
          eq(auditRecords.batchId, batchId),
          isNotNull(auditRecords.identityId),
          isNotNull(employeeIdentities.classification),
          ne(employeeIdentities.classification, "STILL_EMPLOYED")
        )
      );

    terminations = records.map((r) => ({
      employeeName: r.employeeName,
      facilityName: r.facilityName ?? "Unknown",
      classification: r.classification ?? "",
      effectiveDate: r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : "",
      notes: r.notes ?? "",
    }));
  } else {
    // Original behavior
    const records = await db
      .select({
        employeeName: auditRecords.employeeName,
        facilityName: facilities.name,
        classification: auditRecords.classification,
        effectiveDate: auditRecords.effectiveDate,
        notes: auditRecords.classificationNotes,
      })
      .from(auditRecords)
      .leftJoin(facilities, eq(auditRecords.facilityId, facilities.id))
      .where(
        and(
          eq(auditRecords.batchId, batchId),
          isNotNull(auditRecords.classification),
          ne(auditRecords.classification, "STILL_EMPLOYED")
        )
      );

    terminations = records.map((r) => ({
      employeeName: r.employeeName,
      facilityName: r.facilityName ?? "Unknown",
      classification: r.classification ?? "",
      effectiveDate: r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : "",
      notes: r.notes ?? "",
    }));
  }

  return { batch, terminations };
}

export async function generateSubmissionCsv(records: TerminationRecord[]): Promise<string> {
  const headers = "Facility,Employee Name,Classification,Effective Date,Notes";
  const rows = records.map((r) =>
    [r.facilityName, r.employeeName, r.classification, r.effectiveDate, r.notes]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers, ...rows].join("\n");
}

export async function generateSubmissionEmail(
  carrierName: string,
  records: TerminationRecord[]
): Promise<string> {
  const grouped = new Map<string, TerminationRecord[]>();
  for (const r of records) {
    const list = grouped.get(r.facilityName) || [];
    list.push(r);
    grouped.set(r.facilityName, list);
  }

  const facilityRows = Array.from(grouped.entries())
    .map(([facility, recs]) => {
      const rows = recs
        .map(
          (r) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.employeeName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.classification)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.effectiveDate)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.notes)}</td>
        </tr>`
        )
        .join("");

      return `
      <h3 style="color:#1B2A4A;margin:24px 0 8px;">${escapeHtml(facility)} (${recs.length} employee${recs.length !== 1 ? "s" : ""})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #1B2A4A;">Employee</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #1B2A4A;">Classification</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #1B2A4A;">Effective Date</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #1B2A4A;">Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;">
  <div style="background:#1B2A4A;padding:24px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:22px;">Workers' Compensation Audit</h1>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:14px;">Termination Report</p>
  </div>
  <div style="max-width:800px;margin:0 auto;padding:24px;">
    <p>Dear ${escapeHtml(carrierName)},</p>
    <p>Please find below the termination report from our workers' compensation audit. A CSV file with the complete data is attached.</p>
    <p><strong>Total terminations: ${records.length}</strong></p>
    ${facilityRows}
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;">
    <p style="font-size:12px;color:#9ca3af;">This is an automated report generated by the Workers' Compensation Audit Dashboard.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function submitBatch(batchId: string): Promise<{ success: boolean; dryRun: boolean; error?: string }> {
  const data = await getSubmissionData(batchId);
  if (!data) return { success: false, dryRun: false, error: "Batch not found" };

  if (data.batch.status === "SUBMITTED") {
    return { success: false, dryRun: false, error: "Batch already submitted" };
  }

  if (data.terminations.length === 0) {
    return { success: false, dryRun: false, error: "No termination records to submit" };
  }

  const carrierName = data.batch.carrierName ?? "Unknown Carrier";
  const html = await generateSubmissionEmail(carrierName, data.terminations);
  const csv = await generateSubmissionCsv(data.terminations);
  const subject = `Workers' Compensation Audit — Termination Report — ${carrierName}`;

  const result = await sendEmail({
    to: process.env.CARRIER_EMAIL_TO ?? "carrier@example.com",
    subject,
    html,
    csvAttachment: {
      filename: `termination-report-${batchId.slice(0, 8)}.csv`,
      content: csv,
    },
  });

  await db
    .update(auditBatches)
    .set({ status: "SUBMITTED", submittedAt: new Date() })
    .where(eq(auditBatches.id, batchId));

  revalidatePath(`/batches/${batchId}`);
  revalidatePath("/batches");
  revalidatePath("/");

  return { success: true, dryRun: result.dryRun };
}
