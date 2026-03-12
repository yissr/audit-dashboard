"use server";

import { db } from "@/db";
import { auditRecords, facilityOutreaches } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function classifyEmployee(
  recordId: string,
  classification: "STILL_EMPLOYED" | "TERMINATED" | "QUIT" | "SICK_LEAVE" | "FAMILY_LEAVE" | "OTHER",
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

export async function markFacilityDone(
  outreachId: string,
  batchId: string
): Promise<void> {
  if (!outreachId) throw new Error("Outreach ID is required");

  const [outreach] = await db
    .select({ facilityId: facilityOutreaches.facilityId })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.id, outreachId));

  if (!outreach) throw new Error("Outreach record not found");

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

  if (unclassified.length > 0) {
    throw new Error(`${unclassified.length} employee(s) still need classification before marking done.`);
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
