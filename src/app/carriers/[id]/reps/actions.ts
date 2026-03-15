"use server";
import { db } from "@/db";
import { carrierReps, auditBatches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function listReps(carrierId: string) {
  return db.select().from(carrierReps).where(eq(carrierReps.carrierId, carrierId)).orderBy(carrierReps.createdAt);
}

export async function addRep(formData: FormData): Promise<void> {
  const carrierId = formData.get("carrierId") as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  if (!carrierId) throw new Error("Carrier ID is required");
  if (!name) throw new Error("Rep name is required");
  await db.insert(carrierReps).values({ carrierId, name, email, phone });
  revalidatePath(`/carriers/${carrierId}`);
}

export async function deleteRep(repId: string, carrierId: string): Promise<void> {
  // Null out any batch references to this rep before deleting
  await db.update(auditBatches).set({ repId: null }).where(eq(auditBatches.repId, repId));
  await db.delete(carrierReps).where(eq(carrierReps.id, repId));
  revalidatePath(`/carriers/${carrierId}`);
}
