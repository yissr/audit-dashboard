"use server";
import { db } from "@/db";
import { auditPeriods } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createPeriod(formData: FormData): Promise<void> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Period name is required");
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  await db.insert(auditPeriods).values({
    name,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  });
  revalidatePath("/periods");
}

export async function listPeriods() {
  return db.select().from(auditPeriods).orderBy(auditPeriods.createdAt);
}
