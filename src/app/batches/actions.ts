"use server";
import { db } from "@/db";
import { auditBatches, auditRecords, facilities, facilityOutreaches } from "@/db/schema";
import { autoDetectAndParse, autoDetectAndPreview } from "@/lib/parsers/auto-detect";
import { revalidatePath } from "next/cache";
import { eq, and, lte, sql } from "drizzle-orm";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type FacilityMapping = {
  detectedName: string;
  action: "create" | "match";
  newName?: string;
  existingId?: string;
};

export async function previewFile(formData: FormData): Promise<{
  detectedFormat: string;
  facilities: { name: string; employeeCount: number; existingId: string | null }[];
}> {
  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("File is required");
  if (file.size > MAX_FILE_SIZE) throw new Error("File exceeds 10 MB limit");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { detectedFormat, facilities: parsed } = autoDetectAndPreview(buffer, file.name);

  // Look up existing facilities for auto-matching
  const existingFacilities = await db.select().from(facilities);
  const existingMap = new Map<string, string>();
  for (const f of existingFacilities) {
    existingMap.set(f.name.toLowerCase(), f.id);
  }

  const result = parsed.map((f) => ({
    name: f.name,
    employeeCount: f.employeeCount,
    existingId: existingMap.get(f.name.toLowerCase()) ?? null,
  }));

  return { detectedFormat, facilities: result };
}

export async function ingestBatch(formData: FormData) {
  const carrierId = formData.get("carrierId") as string;
  const file = formData.get("file") as File;

  if (!carrierId) throw new Error("Carrier is required");
  if (!file || file.size === 0) throw new Error("File is required");
  if (file.size > MAX_FILE_SIZE) throw new Error("File exceeds 10 MB limit");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { employees } = autoDetectAndParse(buffer, file.name);

  if (employees.length === 0) throw new Error("No employee records found in file");

  // Parse facility mappings if provided (from review step)
  const facilityMappingsRaw = formData.get("facilityMappings") as string | null;
  let facilityMappings: FacilityMapping[] | null = null;
  if (facilityMappingsRaw) {
    facilityMappings = JSON.parse(facilityMappingsRaw) as FacilityMapping[];
  }

  const facilityCache = new Map<string, string>();
  const existingFacilities = await db.select().from(facilities);
  for (const f of existingFacilities) {
    facilityCache.set(f.name.toLowerCase(), f.id);
  }

  // Build mapping from detected facility name → resolved facility ID (using user-provided mappings)
  if (facilityMappings) {
    for (const mapping of facilityMappings) {
      if (mapping.action === "match" && mapping.existingId) {
        facilityCache.set(mapping.detectedName.toLowerCase(), mapping.existingId);
      }
    }
  }

  const result = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(auditBatches).values({
      carrierId,
      sourceFile: file.name,
      status: "DRAFT",
    }).returning();

    const batchFacilityIds = new Set<string>();

    for (const emp of employees) {
      let facilityId = facilityCache.get(emp.facilityName.toLowerCase());
      if (!facilityId) {
        // Determine facility name: use mapping's newName if available, otherwise detected name
        let createName = emp.facilityName;
        if (facilityMappings) {
          const mapping = facilityMappings.find(
            (m) => m.detectedName.toLowerCase() === emp.facilityName.toLowerCase()
          );
          if (mapping?.action === "create" && mapping.newName) {
            createName = mapping.newName;
          }
        }

        const [newFacility] = await tx.insert(facilities).values({
          name: createName,
          contactEmail: null,
          contactName: null,
          notes: "Auto-created during batch ingestion — needs contact info",
        }).returning();
        facilityId = newFacility.id;
        facilityCache.set(emp.facilityName.toLowerCase(), facilityId);
      }

      batchFacilityIds.add(facilityId);

      await tx.insert(auditRecords).values({
        batchId: batch.id,
        facilityId,
        employeeName: emp.employeeName,
        ssnLast4: emp.ssnLast4,
        policyNumber: emp.policyNumber,
      });
    }

    for (const facilityId of batchFacilityIds) {
      await tx.insert(facilityOutreaches).values({
        batchId: batch.id,
        facilityId,
        status: "PENDING_OUTREACH",
      });
    }

    return { batchId: batch.id, recordCount: employees.length };
  });

  revalidatePath("/batches");
  return result;
}

export async function listBatches() {
  return db.select().from(auditBatches).orderBy(auditBatches.receivedAt);
}

export async function updateOutreachStatus(
  outreachId: string,
  status: "PENDING_OUTREACH" | "AWAITING_REPLY" | "REPLIED" | "IN_REVIEW" | "INCOMPLETE" | "SNOOZED" | "DONE"
): Promise<void> {
  const existing = await db
    .select({ id: facilityOutreaches.id, batchId: facilityOutreaches.batchId })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.id, outreachId));

  if (existing.length === 0) throw new Error(`Outreach record not found: ${outreachId}`);

  await db
    .update(facilityOutreaches)
    .set({ status })
    .where(eq(facilityOutreaches.id, outreachId));

  revalidatePath(`/batches/${existing[0].batchId}`);
  revalidatePath("/");
}

export async function snoozeFacility(outreachId: string, durationDays: number): Promise<void> {
  if (durationDays <= 0) throw new Error("Snooze duration must be positive");

  const existing = await db
    .select({ id: facilityOutreaches.id, batchId: facilityOutreaches.batchId })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.id, outreachId));

  if (existing.length === 0) throw new Error(`Outreach record not found: ${outreachId}`);

  const snoozeUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  await db
    .update(facilityOutreaches)
    .set({ status: "SNOOZED", snoozeUntil })
    .where(eq(facilityOutreaches.id, outreachId));

  revalidatePath(`/batches/${existing[0].batchId}`);
  revalidatePath("/");
}

export async function wakeFacility(outreachId: string): Promise<void> {
  const existing = await db
    .select({ id: facilityOutreaches.id, batchId: facilityOutreaches.batchId })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.id, outreachId));

  if (existing.length === 0) throw new Error(`Outreach record not found: ${outreachId}`);

  await db
    .update(facilityOutreaches)
    .set({ status: "AWAITING_REPLY", snoozeUntil: null })
    .where(eq(facilityOutreaches.id, outreachId));

  revalidatePath(`/batches/${existing[0].batchId}`);
  revalidatePath("/");
}

export async function logReminder(outreachId: string): Promise<void> {
  const existing = await db
    .select({ id: facilityOutreaches.id, batchId: facilityOutreaches.batchId })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.id, outreachId));

  if (existing.length === 0) throw new Error(`Outreach record not found: ${outreachId}`);

  await db
    .update(facilityOutreaches)
    .set({
      reminderCount: sql`${facilityOutreaches.reminderCount} + 1`,
      lastReminderAt: new Date(),
    })
    .where(eq(facilityOutreaches.id, outreachId));

  revalidatePath(`/batches/${existing[0].batchId}`);
  revalidatePath("/");
}

export async function checkAndWakeExpiredSnoozes(batchId: string): Promise<void> {
  await db
    .update(facilityOutreaches)
    .set({ status: "AWAITING_REPLY", snoozeUntil: null })
    .where(
      and(
        eq(facilityOutreaches.batchId, batchId),
        eq(facilityOutreaches.status, "SNOOZED"),
        lte(facilityOutreaches.snoozeUntil, new Date())
      )
    );
}
