"use server";

import { db } from "@/db";
import { simOutbox, inboundEmails, facilityOutreaches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitSimReply(simOutboxId: string, replyText: string): Promise<void> {
  if (!simOutboxId) throw new Error("simOutboxId is required");
  if (!replyText.trim()) throw new Error("Reply text is required");

  // Fetch the sim outbox entry
  const [entry] = await db
    .select()
    .from(simOutbox)
    .where(eq(simOutbox.id, simOutboxId));

  if (!entry) throw new Error("Sim outbox entry not found");

  const mockMessageId = `sim-reply-${Date.now()}`;

  // Insert into inboundEmails
  const [inbound] = await db
    .insert(inboundEmails)
    .values({
      graphMessageId: mockMessageId,
      graphConversationId: entry.conversationId,
      fromAddress: `${entry.facilityName.replace(/\s+/g, "-").toLowerCase()}@simulation.local`,
      subject: `Re: ${entry.subject}`,
      bodyText: replyText,
      receivedAt: new Date(),
      processingStatus: "PENDING",
    })
    .returning();

  // Find matching outreach by conversationId
  const [outreach] = await db
    .select({ id: facilityOutreaches.id, batchId: facilityOutreaches.batchId })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.graphConversationId, entry.conversationId));

  if (outreach) {
    // Update outreach to REPLIED
    await db
      .update(facilityOutreaches)
      .set({
        status: "REPLIED",
        repliedAt: new Date(),
        replyRaw: replyText,
      })
      .where(eq(facilityOutreaches.id, outreach.id));

    // Update inbound email to MATCHED
    await db
      .update(inboundEmails)
      .set({
        processingStatus: "MATCHED",
        matchedOutreachId: outreach.id,
      })
      .where(eq(inboundEmails.id, inbound.id));

    revalidatePath(`/batches/${outreach.batchId}`);
  }

  // Mark sim outbox entry as replied
  await db
    .update(simOutbox)
    .set({ repliedAt: new Date() })
    .where(eq(simOutbox.id, simOutboxId));

  revalidatePath("/sim-inbox");
  revalidatePath("/");
}
