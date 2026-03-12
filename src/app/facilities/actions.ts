"use server";
import { db } from "@/db";
import { facilities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createFacility(formData: FormData) {
  const name = formData.get("name") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const contactName = formData.get("contactName") as string;
  const notes = formData.get("notes") as string;

  if (!name?.trim()) throw new Error("Facility name is required");

  await db.insert(facilities).values({
    name: name.trim(),
    contactEmail: contactEmail || null,
    contactName: contactName || null,
    notes: notes || null,
  });
  revalidatePath("/facilities");
}

export async function listFacilities() {
  return db.select().from(facilities).orderBy(facilities.name);
}

export async function updateFacility(id: string, formData: FormData) {
  await db.update(facilities).set({
    name: formData.get("name") as string,
    contactEmail: (formData.get("contactEmail") as string) || null,
    contactName: (formData.get("contactName") as string) || null,
    notes: (formData.get("notes") as string) || null,
  }).where(eq(facilities.id, id));
  revalidatePath("/facilities");
}

export async function deleteFacility(id: string) {
  await db.delete(facilities).where(eq(facilities.id, id));
  revalidatePath("/facilities");
}
