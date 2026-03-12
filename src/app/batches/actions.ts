"use server";
import { db } from "@/db";
import { auditBatches, auditRecords, facilities, facilityOutreaches } from "@/db/schema";
import { parseCsvBuffer } from "@/lib/parsers/csv";
import { parseXlsxBuffer } from "@/lib/parsers/xlsx";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function ingestBatch(formData: FormData) {
  const carrierId = formData.get("carrierId") as string;
  const file = formData.get("file") as File;
  const columnMappingRaw = formData.get("columnMapping") as string;

  if (!carrierId) throw new Error("Carrier is required");
  if (!file || file.size === 0) throw new Error("File is required");
  if (file.size > MAX_FILE_SIZE) throw new Error("File exceeds 10 MB limit");

  const columnMapping: Record<string, string> = columnMappingRaw?.trim()
    ? JSON.parse(columnMappingRaw)
    : {};

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  let employees;
  if (fileName.endsWith(".csv")) {
    employees = parseCsvBuffer(buffer, columnMapping);
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    employees = parseXlsxBuffer(buffer, columnMapping);
  } else {
    throw new Error("Unsupported file type. Upload a CSV or XLSX file.");
  }

  if (employees.length === 0) throw new Error("No employee records found in file");

  const facilityCache = new Map<string, string>();
  const existingFacilities = await db.select().from(facilities);
  for (const f of existingFacilities) {
    facilityCache.set(f.name.toLowerCase(), f.id);
  }

  const result = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(auditBatches).values({
      carrierId,
      sourceFile: file.name,
      status: "DRAFT",
    }).returning();

    // Track unique facilityIds seen in this batch for outreach creation
    const batchFacilityIds = new Set<string>();

    for (const emp of employees) {
      let facilityId = facilityCache.get(emp.facilityName.toLowerCase());
      if (!facilityId) {
        const [newFacility] = await tx.insert(facilities).values({
          name: emp.facilityName,
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

    // Insert one facilityOutreaches row per unique facility in this batch
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

  if (existing.length === 0) {
    throw new Error(`Outreach record not found: ${outreachId}`);
  }

  await db
    .update(facilityOutreaches)
    .set({ status })
    .where(eq(facilityOutreaches.id, outreachId));

  revalidatePath(`/batches/${existing[0].batchId}`);
  revalidatePath("/");
}
