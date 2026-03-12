"use server";
import { db } from "@/db";
import { carriers } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createCarrier(formData: FormData) {
  const name = formData.get("name") as string;
  const emailPattern = formData.get("emailPattern") as string;
  const fileType = (formData.get("fileType") as "CSV" | "XLSX" | "PDF") ?? "CSV";

  if (!name?.trim()) throw new Error("Carrier name is required");

  await db.insert(carriers).values({ name: name.trim(), emailPattern: emailPattern || null, fileType });
  revalidatePath("/carriers");
}

export async function listCarriers() {
  return db.select().from(carriers).orderBy(carriers.createdAt);
}
