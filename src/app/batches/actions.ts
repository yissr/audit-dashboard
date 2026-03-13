"use server";
import { db } from "@/db";
import { auditBatches, auditRecords, auditPeriods, carriers, facilities, facilityOutreaches, employeeIdentities } from "@/db/schema";
import { autoDetectAndParse, autoDetectAndPreview } from "@/lib/parsers/auto-detect";
import { revalidatePath } from "next/cache";
import { eq, and, lte, isNotNull, sql, inArray } from "drizzle-orm";
import { type OutreachStatus, assertValidTransition } from "@/lib/outreach-transitions";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type FacilityMapping = {
  detectedName: string;
  action: "create" | "match";
  newName?: string;
  existingId?: string;
};

type EmployeeIdentity = typeof employeeIdentities.$inferSelect;

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().replace(/\s+/g, " ");
}

async function findOrCreateIdentity(
  periodId: string,
  linkedPeriodId: string | null,
  facilityId: string,
  emp: { employeeName: string; ssnLast4?: string; policyNumber?: string },
  carrierName: string,
  cache: Map<string, EmployeeIdentity[]>
): Promise<string> {
  const cacheKey = `${periodId}:${facilityId}`;

  // Load primary period identities
  if (!cache.has(cacheKey)) {
    const existing = await db.select().from(employeeIdentities).where(
      and(eq(employeeIdentities.periodId, periodId), eq(employeeIdentities.facilityId, facilityId))
    );
    cache.set(cacheKey, existing);
  }

  // Load linked period identities if applicable
  const linkedKey = linkedPeriodId ? `${linkedPeriodId}:${facilityId}` : null;
  if (linkedKey && !cache.has(linkedKey)) {
    const linkedExisting = await db.select().from(employeeIdentities).where(
      and(eq(employeeIdentities.periodId, linkedPeriodId!), eq(employeeIdentities.facilityId, facilityId))
    );
    cache.set(linkedKey, linkedExisting);
  }

  // Merge both lists for search
  const primaryList = cache.get(cacheKey)!;
  const linkedList = linkedKey ? (cache.get(linkedKey) ?? []) : [];
  const identities = [...primaryList, ...linkedList];

  const normName = normalize(emp.employeeName);

  // Matching priority: ssn → policyNumber → name
  let match: EmployeeIdentity | undefined;

  if (emp.ssnLast4) {
    match = identities.find((i) => i.ssnLast4 && i.ssnLast4 === emp.ssnLast4);
  }

  if (!match && emp.policyNumber) {
    match = identities.find((i) => i.policyNumber && i.policyNumber === emp.policyNumber);
  }

  if (!match) {
    match = identities.find((i) => normalize(i.canonicalName) === normName);
  }

  if (match) {
    // Update coverageTypes and backfill identifiers if missing
    const updatedCoverage = match.coverageTypes ?? [];
    const needsCoverageUpdate = !updatedCoverage.includes(carrierName);
    const needsSsnUpdate = !match.ssnLast4 && emp.ssnLast4;
    const needsPolicyUpdate = !match.policyNumber && emp.policyNumber;

    if (needsCoverageUpdate || needsSsnUpdate || needsPolicyUpdate) {
      const updates: Partial<EmployeeIdentity> = {};
      if (needsCoverageUpdate) updates.coverageTypes = [...updatedCoverage, carrierName];
      if (needsSsnUpdate) updates.ssnLast4 = emp.ssnLast4;
      if (needsPolicyUpdate) updates.policyNumber = emp.policyNumber;

      await db.update(employeeIdentities).set(updates).where(eq(employeeIdentities.id, match.id));

      // Update the correct cache list (check which list contains the match by id)
      const primaryIdx = primaryList.findIndex((i) => i.id === match!.id);
      if (primaryIdx !== -1) {
        primaryList[primaryIdx] = { ...primaryList[primaryIdx], ...updates };
      } else if (linkedKey) {
        const linkedListCache = cache.get(linkedKey)!;
        const linkedIdx = linkedListCache.findIndex((i) => i.id === match!.id);
        if (linkedIdx !== -1) {
          linkedListCache[linkedIdx] = { ...linkedListCache[linkedIdx], ...updates };
        }
      }
    }

    return match.id;
  }

  // No match — create new identity under periodId (not linkedPeriodId)
  const [newIdentity] = await db
    .insert(employeeIdentities)
    .values({
      periodId,
      facilityId,
      canonicalName: emp.employeeName,
      ssnLast4: emp.ssnLast4 ?? null,
      policyNumber: emp.policyNumber ?? null,
      coverageTypes: [carrierName],
      classification: "STILL_EMPLOYED",
    })
    .returning();

  primaryList.push(newIdentity);
  return newIdentity.id;
}

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
  const repId = (formData.get("repId") as string) || null;
  const periodId = (formData.get("periodId") as string) || null;

  if (!carrierId) throw new Error("Carrier is required");
  if (!file || file.size === 0) throw new Error("File is required");
  if (file.size > MAX_FILE_SIZE) throw new Error("File exceeds 10 MB limit");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { employees } = autoDetectAndParse(buffer, file.name);

  if (employees.length === 0) throw new Error("No employee records found in file");

  // Get carrier name for identity matching
  let carrierName = "Unknown";
  if (periodId) {
    const [carrierRow] = await db.select({ name: carriers.name }).from(carriers).where(eq(carriers.id, carrierId));
    if (carrierRow) carrierName = carrierRow.name;
  }

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

  const [batch] = await db.insert(auditBatches).values({
    carrierId,
    sourceFile: file.name,
    status: "DRAFT",
    repId: repId || undefined,
    periodId: periodId || undefined,
  }).returning();

  // Fetch the period's linkedPeriodId for cross-period dedup
  let linkedPeriodId: string | null = null;
  if (periodId) {
    const [periodRow] = await db
      .select({ linkedPeriodId: auditPeriods.linkedPeriodId })
      .from(auditPeriods)
      .where(eq(auditPeriods.id, periodId));
    linkedPeriodId = periodRow?.linkedPeriodId ?? null;
  }

  const batchFacilityIds = new Set<string>();
  const identityCache = new Map<string, EmployeeIdentity[]>();

  for (const emp of employees) {
    let facilityId = facilityCache.get(emp.facilityName.toLowerCase());
    if (!facilityId) {
      let createName = emp.facilityName;
      if (facilityMappings) {
        const mapping = facilityMappings.find(
          (m) => m.detectedName.toLowerCase() === emp.facilityName.toLowerCase()
        );
        if (mapping?.action === "create" && mapping.newName) {
          createName = mapping.newName;
        }
      }

      const [newFacility] = await db.insert(facilities).values({
        name: createName,
        contactEmail: null,
        contactName: null,
        notes: "Auto-created during batch ingestion — needs contact info",
      }).returning();
      facilityId = newFacility.id;
      facilityCache.set(emp.facilityName.toLowerCase(), facilityId);
    }

    batchFacilityIds.add(facilityId);

    // Identity matching if period is set
    let identityId: string | undefined;
    if (periodId) {
      identityId = await findOrCreateIdentity(
        periodId,
        linkedPeriodId,
        facilityId,
        { employeeName: emp.employeeName, ssnLast4: emp.ssnLast4, policyNumber: emp.policyNumber },
        carrierName,
        identityCache
      );
    }

    await db.insert(auditRecords).values({
      batchId: batch.id,
      facilityId,
      employeeName: emp.employeeName,
      ssnLast4: emp.ssnLast4,
      policyNumber: emp.policyNumber,
      identityId: identityId ?? null,
    });
  }

  // Track which (periodId, facilityId) outreaches already exist to avoid duplicates
  const existingOutreachKeys = new Set<string>();
  if (periodId) {
    const existingOutreaches = await db
      .select({ facilityId: facilityOutreaches.facilityId })
      .from(facilityOutreaches)
      .where(eq(facilityOutreaches.periodId, periodId));
    for (const o of existingOutreaches) {
      existingOutreachKeys.add(o.facilityId);
    }
  }

  for (const facilityId of batchFacilityIds) {
    if (periodId && existingOutreachKeys.has(facilityId)) {
      // Already have an outreach for this period+facility — skip
      continue;
    }
    await db.insert(facilityOutreaches).values({
      batchId: batch.id,
      facilityId,
      status: "DRAFT",
      periodId: periodId ?? undefined,
    });
  }

  const result = { batchId: batch.id, recordCount: employees.length };

  revalidatePath("/batches");
  return result;
}

export async function listBatches() {
  return db.select().from(auditBatches).orderBy(auditBatches.receivedAt);
}

export async function updateOutreachStatus(
  outreachId: string,
  status: OutreachStatus
): Promise<void> {
  const existing = await db
    .select({ id: facilityOutreaches.id, batchId: facilityOutreaches.batchId, status: facilityOutreaches.status })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.id, outreachId));

  if (existing.length === 0) throw new Error(`Outreach record not found: ${outreachId}`);

  const currentStatus = existing[0].status as OutreachStatus;
  assertValidTransition(currentStatus, status);

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

  // Snooze sets snoozeUntil only — does NOT change status
  await db
    .update(facilityOutreaches)
    .set({ snoozeUntil })
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

  // Wake clears snoozeUntil only — does NOT change status
  await db
    .update(facilityOutreaches)
    .set({ snoozeUntil: null })
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
  // Clear snoozeUntil for expired snoozes — does NOT change status
  await db
    .update(facilityOutreaches)
    .set({ snoozeUntil: null })
    .where(
      and(
        eq(facilityOutreaches.batchId, batchId),
        isNotNull(facilityOutreaches.snoozeUntil),
        lte(facilityOutreaches.snoozeUntil, new Date())
      )
    );
}
