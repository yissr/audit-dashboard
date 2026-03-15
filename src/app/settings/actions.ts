"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSimulationMode(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "simulation_mode"));
    return row?.value === "true";
  } catch {
    // Table doesn't exist yet — default to false
    return false;
  }
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

export async function getReminderSettings(): Promise<{
  firstReminderDays: number;
  betweenRemindersDays: number;
  maxReminders: number;
}> {
  try {
    const [first] = await db.select().from(settings).where(eq(settings.key, "reminder_first_days"));
    const [between] = await db.select().from(settings).where(eq(settings.key, "reminder_between_days"));
    const [maxR] = await db.select().from(settings).where(eq(settings.key, "reminder_max_count"));
    return {
      firstReminderDays: first ? parseInt(first.value, 10) : 7,
      betweenRemindersDays: between ? parseInt(between.value, 10) : 7,
      maxReminders: maxR ? parseInt(maxR.value, 10) : 3,
    };
  } catch {
    return { firstReminderDays: 7, betweenRemindersDays: 7, maxReminders: 3 };
  }
}

export async function setReminderSettings(
  firstReminderDays: number,
  betweenRemindersDays: number,
  maxReminders: number
): Promise<void> {
  const upsert = async (key: string, value: string) => {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  };
  await upsert("reminder_first_days", String(firstReminderDays));
  await upsert("reminder_between_days", String(betweenRemindersDays));
  await upsert("reminder_max_count", String(maxReminders));
  revalidatePath("/configuration");
}
