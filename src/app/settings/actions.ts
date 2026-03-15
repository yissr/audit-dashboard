"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSimulationMode(): Promise<boolean> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "simulation_mode"));
  return row?.value === "true";
}

export async function setSimulationMode(enabled: boolean): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "simulation_mode", value: enabled ? "true" : "false" })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: enabled ? "true" : "false" },
    });
  revalidatePath("/");
}
