"use server";

import { db } from "@/db";
import { auditRecords, auditPeriods, auditBatches, facilityOutreaches, employeeIdentities, facilities, simOutbox } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendGraphEmail } from "@/lib/graph-client";
import { getSimulationMode } from "@/app/settings/actions";

export async function sendOutreachEmail(
  outreachId: string,
  cc: string[],
  subject: string,
  bodyText: string,
): Promise<void> {
  if (!outreachId) throw new Error("Outreach ID is required");

  // Fetch outreach + facility + batch + period
  const [row] = await db
    .select({
      outreachId: facilityOutreaches.id,
      batchId: facilityOutreaches.batchId,
      facilityId: facilityOutreaches.facilityId,
      facilityName: facilities.name,
      contactEmail: facilities.contactEmail,
      periodName: auditPeriods.name,
    })
    .from(facilityOutreaches)
    .leftJoin(facilities, eq(facilityOutreaches.facilityId, facilities.id))
    .leftJoin(auditBatches, eq(facilityOutreaches.batchId, auditBatches.id))
    .leftJoin(auditPeriods, eq(auditBatches.periodId, auditPeriods.id))
    .where(eq(facilityOutreaches.id, outreachId));

  if (!row) throw new Error("Outreach not found");

  // Fetch employee names for this facility in this batch
  const batchRecords = await db
    .select({ employeeName: auditRecords.employeeName, identityId: auditRecords.identityId })
    .from(auditRecords)
    .where(and(eq(auditRecords.batchId, row.batchId), eq(auditRecords.facilityId, row.facilityId)));

  // If period-aware, use identity canonical names (deduplicated)
  let employeeNames: string[] = [];
  if (batchRecords.some((r) => r.identityId)) {
    const identityIds = [...new Set(batchRecords.map((r) => r.identityId).filter((x): x is string => x !== null))];
    if (identityIds.length > 0) {
      const identities = await db
        .select({ canonicalName: employeeIdentities.canonicalName })
        .from(employeeIdentities)
        .where(inArray(employeeIdentities.id, identityIds));
      employeeNames = identities.map((i) => i.canonicalName).sort();
    }
  } else {
    employeeNames = [...new Set(batchRecords.map((r) => r.employeeName))].sort();
  }

  const employeeListText = employeeNames.length > 0
    ? `\n\nEmployee List (${employeeNames.length} employees):\n${employeeNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
    : "";

  const fullBodyText = bodyText + employeeListText;

  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const htmlBody = `<html><body><pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${escape(fullBodyText)}</pre></body></html>`;

  const simMode = await getSimulationMode();

  if (simMode) {
    const toAddress = row.contactEmail ?? `sim-${row.facilityId}@simulation.local`;
    const mockMessageId = `sim-msg-${Date.now()}`;
    const mockConversationId = `sim-conv-${outreachId}`;

    await db
      .update(facilityOutreaches)
      .set({
        status: "SENT",
        sentAt: new Date(),
        graphMessageId: mockMessageId,
        graphConversationId: mockConversationId,
        emailBodyHtml: htmlBody,
      })
      .where(eq(facilityOutreaches.id, outreachId));

    await db.insert(simOutbox).values({
      outreachId,
      facilityName: row.facilityName ?? "Unknown Facility",
      toAddress,
      subject,
      htmlBody,
      conversationId: mockConversationId,
    });
  } else {
    if (!row.contactEmail) throw new Error("Facility has no contact email");

    const result = await sendGraphEmail({
      to: row.contactEmail,
      cc,
      subject,
      htmlBody,
    });

    await db
      .update(facilityOutreaches)
      .set({
        status: "SENT",
        sentAt: new Date(),
        graphMessageId: result.messageId,
        graphConversationId: result.conversationId,
        emailBodyHtml: htmlBody,
      })
      .where(eq(facilityOutreaches.id, outreachId));
  }

  revalidatePath(`/batches/${row.batchId}`);
  revalidatePath("/");
}

export async function classifyEmployee(
  recordId: string,
  classification: "STILL_EMPLOYED" | "TERMINATED" | "TRANSFERRED" | "FMLA" | "LOA" | "WORKERS_COMP" | "NOT_ON_PAYROLL",
  notes?: string,
  effectiveDate?: string
): Promise<void> {
  if (!recordId) throw new Error("Record ID is required");

  await db
    .update(auditRecords)
    .set({
      classification,
      classificationNotes: notes || null,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      classifiedBy: "dashboard-user",
      classifiedAt: new Date(),
    })
    .where(eq(auditRecords.id, recordId));

  const [record] = await db
    .select({ batchId: auditRecords.batchId, facilityId: auditRecords.facilityId })
    .from(auditRecords)
    .where(eq(auditRecords.id, recordId));

  if (record) {
    revalidatePath(`/batches/${record.batchId}/facilities/${record.facilityId}`);
    revalidatePath(`/batches/${record.batchId}`);
  }
}

export async function classifyIdentity(
  identityId: string,
  classification: "STILL_EMPLOYED" | "TERMINATED" | "TRANSFERRED" | "FMLA" | "LOA" | "WORKERS_COMP" | "NOT_ON_PAYROLL",
  notes: string,
  effectiveDate: string
): Promise<void> {
  if (!identityId) throw new Error("Identity ID is required");
  await db
    .update(employeeIdentities)
    .set({
      classification,
      classificationNotes: notes || null,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      classifiedBy: "dashboard-user",
      classifiedAt: new Date(),
    })
    .where(eq(employeeIdentities.id, identityId));
  // revalidate broadly since we don't have batchId here
  revalidatePath("/batches", "layout");
}

export async function updateIdentityName(
  identityId: string,
  newName: string
): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Name cannot be empty");

  await db
    .update(employeeIdentities)
    .set({ canonicalName: trimmed })
    .where(eq(employeeIdentities.id, identityId));

  revalidatePath("/batches", "layout");
}

export async function markFacilityDone(
  outreachId: string,
  batchId: string
): Promise<void> {
  if (!outreachId) throw new Error("Outreach ID is required");

  const [outreach] = await db
    .select({ facilityId: facilityOutreaches.facilityId, periodId: facilityOutreaches.periodId })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.id, outreachId));

  if (!outreach) throw new Error("Outreach record not found");

  let unclassifiedCount = 0;
  if (outreach.periodId) {
    let linkedPeriodId: string | null = null;
    const [periodRow] = await db
      .select({ linkedPeriodId: auditPeriods.linkedPeriodId })
      .from(auditPeriods)
      .where(eq(auditPeriods.id, outreach.periodId));
    linkedPeriodId = periodRow?.linkedPeriodId ?? null;

    const periodIds = [outreach.periodId!, linkedPeriodId].filter((x): x is string => x !== null);
    const unclassified = await db
      .select({ id: employeeIdentities.id })
      .from(employeeIdentities)
      .where(
        and(
          inArray(employeeIdentities.periodId, periodIds),
          eq(employeeIdentities.facilityId, outreach.facilityId),
          isNull(employeeIdentities.classification)
        )
      );
    unclassifiedCount = unclassified.length;
  } else {
    const unclassified = await db
      .select({ id: auditRecords.id })
      .from(auditRecords)
      .where(
        and(
          eq(auditRecords.batchId, batchId),
          eq(auditRecords.facilityId, outreach.facilityId),
          isNull(auditRecords.classification)
        )
      );
    unclassifiedCount = unclassified.length;
  }
  if (unclassifiedCount > 0) {
    throw new Error(`${unclassifiedCount} employee(s) still need classification before marking done.`);
  }

  await db
    .update(facilityOutreaches)
    .set({
      status: "DONE",
      doneAt: new Date(),
    })
    .where(eq(facilityOutreaches.id, outreachId));

  revalidatePath(`/batches/${batchId}`);
  revalidatePath("/");
}

export async function markFacilityIncomplete(
  outreachId: string,
  batchId: string,
  reason: string
): Promise<void> {
  if (!outreachId) throw new Error("Outreach ID is required");
  if (!reason.trim()) throw new Error("Reason is required");

  await db
    .update(facilityOutreaches)
    .set({
      status: "INCOMPLETE",
      incompleteReason: reason.trim(),
    })
    .where(eq(facilityOutreaches.id, outreachId));

  revalidatePath(`/batches/${batchId}`);
}
