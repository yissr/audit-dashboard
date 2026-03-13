"use server";
import { db } from "@/db";
import { carriers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCarrier(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Carrier name is required");
  await db.insert(carriers).values({ name });
  revalidatePath("/carriers");
}

export async function listCarriers() {
  return db.select().from(carriers).orderBy(carriers.createdAt);
}

export async function deleteCarrier(carrierId: string): Promise<void> {
  await db.delete(carriers).where(eq(carriers.id, carrierId));
  revalidatePath("/carriers");
}

export async function updateCarrierLogo(carrierId: string, logoUrl: string | null): Promise<void> {
  await db.update(carriers).set({ logoUrl }).where(eq(carriers.id, carrierId));
  revalidatePath(`/carriers/${carrierId}`);
  revalidatePath("/carriers");
}

export async function updateCarrierCcEmails(carrierId: string, ccEmails: string[]): Promise<void> {
  await db.update(carriers).set({ ccEmails }).where(eq(carriers.id, carrierId));
  revalidatePath(`/carriers/${carrierId}`);
  revalidatePath("/carriers");
}
