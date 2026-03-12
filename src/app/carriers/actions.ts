"use server";
import { db } from "@/db";
import { carriers } from "@/db/schema";
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
