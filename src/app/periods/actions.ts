"use server";
import { db } from "@/db";
import { auditPeriods } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getLinkedPeriodInfo } from "@/lib/period-utils";

export async function createPeriod(formData: FormData): Promise<void> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Period name is required");
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const periodType = (formData.get("periodType") as "monthly" | "quarterly") ?? null;
  const monthOrQuarterRaw = formData.get("monthOrQuarter") as string | null;
  const monthOrQuarter = monthOrQuarterRaw !== null ? Number(monthOrQuarterRaw) : null;

  const [current] = await db.insert(auditPeriods).values({
    name,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  }).returning();

  // Auto-link if this is an overlap period
  if (periodType && monthOrQuarter !== null) {
    const linkedInfo = getLinkedPeriodInfo(periodType, new Date(startDate || Date.now()).getFullYear(), monthOrQuarter);
    if (linkedInfo) {
      // Find or create the linked period
      const existing = await db
        .select({ id: auditPeriods.id, linkedPeriodId: auditPeriods.linkedPeriodId })
        .from(auditPeriods)
        .where(eq(auditPeriods.name, linkedInfo.name));

      let linkedId: string;
      if (existing.length > 0) {
        linkedId = existing[0].id;
      } else {
        const [created] = await db.insert(auditPeriods).values({
          name: linkedInfo.name,
          startDate: new Date(linkedInfo.startDate),
          endDate: new Date(linkedInfo.endDate),
        }).returning();
        linkedId = created.id;
      }

      // Set current → linked (only if not already set)
      await db.update(auditPeriods)
        .set({ linkedPeriodId: linkedId })
        .where(eq(auditPeriods.id, current.id));

      // Set linked → current (only if not already set)
      if (existing.length === 0 || existing[0].linkedPeriodId === null) {
        await db.update(auditPeriods)
          .set({ linkedPeriodId: current.id })
          .where(eq(auditPeriods.id, linkedId));
      }
    }
  }

  revalidatePath("/periods");
}

export async function listPeriods() {
  return db.select().from(auditPeriods).orderBy(auditPeriods.createdAt);
}
