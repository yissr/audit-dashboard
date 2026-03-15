import { db } from "@/db";
import {
  facilityOutreaches,
  facilities,
  auditRecords,
  employeeIdentities,
  simOutbox,
  outreachEvents,
  auditBatches,
} from "@/db/schema";
import { eq, and, or, isNull, lte, isNotNull, inArray, sql } from "drizzle-orm";
import { getSimulationMode } from "@/app/settings/actions";
import { sendGraphEmail } from "@/lib/graph-client";

// ─── Reminder timing constants ────────────────────────────────────────────────
const FIRST_REMINDER_DAYS = 7;
const BETWEEN_REMINDERS_DAYS = 7;
const MAX_REMINDERS = 3;

function subDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function GET(request: Request) {
  // Verify CRON_SECRET header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const firstReminderCutoff = subDays(FIRST_REMINDER_DAYS);
  const betweenRemindersCutoff = subDays(BETWEEN_REMINDERS_DAYS);

  // Find all outreaches eligible for a reminder
  const candidates = await db
    .select({
      outreachId: facilityOutreaches.id,
      batchId: facilityOutreaches.batchId,
      facilityId: facilityOutreaches.facilityId,
      reminderCount: facilityOutreaches.reminderCount,
      sentAt: facilityOutreaches.sentAt,
      lastReminderAt: facilityOutreaches.lastReminderAt,
      snoozeUntil: facilityOutreaches.snoozeUntil,
      emailBodyHtml: facilityOutreaches.emailBodyHtml,
      graphConversationId: facilityOutreaches.graphConversationId,
      facilityName: facilities.name,
      contactEmail: facilities.contactEmail,
    })
    .from(facilityOutreaches)
    .leftJoin(facilities, eq(facilityOutreaches.facilityId, facilities.id))
    .where(
      and(
        eq(facilityOutreaches.status, "SENT"),
        isNotNull(facilityOutreaches.sentAt),
        // reminderCount < MAX_REMINDERS
        sql`${facilityOutreaches.reminderCount} < ${MAX_REMINDERS}`,
        // snoozeUntil is null OR snoozeUntil <= now
        or(
          isNull(facilityOutreaches.snoozeUntil),
          lte(facilityOutreaches.snoozeUntil, now)
        ),
        // Either first reminder (lastReminderAt null AND sentAt old enough)
        // Or subsequent reminder (lastReminderAt not null AND lastReminderAt old enough)
        or(
          and(
            isNull(facilityOutreaches.lastReminderAt),
            lte(facilityOutreaches.sentAt, firstReminderCutoff)
          ),
          and(
            isNotNull(facilityOutreaches.lastReminderAt),
            lte(facilityOutreaches.lastReminderAt, betweenRemindersCutoff)
          )
        )
      )
    );

  const simMode = await getSimulationMode();
  let sent = 0;
  let skipped = 0;

  for (const outreach of candidates) {
    try {
      const reminderNum = (outreach.reminderCount ?? 0) + 1;
      const facilityName = outreach.facilityName ?? "Facility";

      // Fetch employee names (same logic as sendOutreachEmail)
      const batchRecords = await db
        .select({
          employeeName: auditRecords.employeeName,
          identityId: auditRecords.identityId,
        })
        .from(auditRecords)
        .where(
          and(
            eq(auditRecords.batchId, outreach.batchId),
            eq(auditRecords.facilityId, outreach.facilityId)
          )
        );

      let employeeNames: string[] = [];
      if (batchRecords.some((r) => r.identityId)) {
        const identityIds = [
          ...new Set(
            batchRecords
              .map((r) => r.identityId)
              .filter((x): x is string => x !== null)
          ),
        ];
        if (identityIds.length > 0) {
          const identities = await db
            .select({ canonicalName: employeeIdentities.canonicalName })
            .from(employeeIdentities)
            .where(inArray(employeeIdentities.id, identityIds));
          employeeNames = identities.map((i) => i.canonicalName).sort();
        }
      } else {
        employeeNames = [
          ...new Set(batchRecords.map((r) => r.employeeName)),
        ].sort();
      }

      const NL = "\n";
      const employeeListText =
        employeeNames.length > 0
          ? NL +
            NL +
            "Employee List (" +
            employeeNames.length +
            " employees):" +
            NL +
            employeeNames.map((n, i) => i + 1 + ". " + n).join(NL)
          : "";

      const subject = `Reminder #${reminderNum}: Workers' Compensation Audit — ${facilityName}`;
      const bodyText =
        "Dear " +
        facilityName +
        "," +
        NL +
        NL +
        "This is a reminder regarding our workers' compensation audit. We have not yet received a response from your facility." +
        NL +
        NL +
        "Please review the employee list below and provide classification information at your earliest convenience." +
        NL +
        NL +
        "Thank you," +
        NL +
        "Empire Benefit Solutions" +
        employeeListText;

      const escape = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const htmlBody = `<html><body><pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${escape(bodyText)}</pre></body></html>`;

      if (simMode) {
        const toAddress =
          outreach.contactEmail ??
          `sim-${outreach.facilityId}@simulation.local`;
        await db.insert(simOutbox).values({
          outreachId: outreach.outreachId,
          facilityName,
          toAddress,
          subject,
          htmlBody,
          conversationId:
            outreach.graphConversationId ??
            `sim-conv-${outreach.outreachId}`,
        });
      } else {
        if (!outreach.contactEmail) {
          console.warn(
            `[cron/reminders] Skipping outreach ${outreach.outreachId} — no contact email`
          );
          skipped++;
          continue;
        }
        await sendGraphEmail({
          to: outreach.contactEmail,
          subject,
          htmlBody,
        });
      }

      // Update outreach: increment reminderCount, set lastReminderAt
      await db
        .update(facilityOutreaches)
        .set({
          reminderCount: sql`${facilityOutreaches.reminderCount} + 1`,
          lastReminderAt: now,
        })
        .where(eq(facilityOutreaches.id, outreach.outreachId));

      // Insert outreach event
      await db.insert(outreachEvents).values({
        outreachId: outreach.outreachId,
        eventType: "REMINDER",
        note: `Automated reminder #${reminderNum}`,
        emailSent: true,
      });

      sent++;
    } catch (err) {
      console.error(
        `[cron/reminders] Error processing outreach ${outreach.outreachId}:`,
        err
      );
      skipped++;
    }
  }

  console.log(`[cron/reminders] Done — sent: ${sent}, skipped: ${skipped}`);
  return Response.json({ sent, skipped });
}
