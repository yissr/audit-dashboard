"use server";
import { db } from "@/db";
import { carriers } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createCarrier(formData: FormData) {
  const name = formData.get("name") as string;
  const emailPattern = formData.get("emailPattern") as string;
  const fileType = (formData.get("fileType") as "CSV" | "XLSX" | "PDF") ?? "CSV";
  const parserType = (formData.get("parserType") as string) ?? "standard";

  if (!name?.trim()) throw new Error("Carrier name is required");

  // Build parser config stored in columnMapping
  const columnMapping: Record<string, string> = { _parser: parserType };

  if (parserType === "group-by-field") {
    const fields = ["facilityField", "facilityPrefix", "firstNameField", "lastNameField", "memberIdField", "ssnField"];
    for (const f of fields) {
      const val = (formData.get(f) as string)?.trim();
      if (val) columnMapping[`_${f}`] = val;
    }
  }

  await db.insert(carriers).values({
    name: name.trim(),
    emailPattern: emailPattern || null,
    fileType,
    columnMapping,
  });
  revalidatePath("/carriers");
}

export async function listCarriers() {
  return db.select().from(carriers).orderBy(carriers.createdAt);
}
