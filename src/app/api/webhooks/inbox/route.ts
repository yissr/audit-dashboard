import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inboundEmails, facilityOutreaches } from "@/db/schema";
import { eq } from "drizzle-orm";

interface InboundEmailPayload {
  internetMessageId: string;
  conversationId: string;
  from: string;
  subject: string;
  bodyPreview?: string;
  bodyContent?: string;
  bodyHtml?: string;
  bodyText?: string;
  receivedDateTime: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.WEBHOOK_SECRET;

  // Auth check
  if (webhookSecret) {
    const headerSecret = req.headers.get("x-webhook-secret");
    if (!headerSecret || headerSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[webhook/inbox] WEBHOOK_SECRET is not set — accepting all requests (dev mode)");
  }

  let payload: InboundEmailPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    internetMessageId,
    conversationId,
    from,
    subject,
    bodyContent,
    bodyHtml,
    bodyText,
    receivedDateTime,
  } = payload;

  if (!internetMessageId || !conversationId || !from || !subject || !receivedDateTime) {
    return NextResponse.json(
      { error: "Missing required fields: internetMessageId, conversationId, from, subject, receivedDateTime" },
      { status: 400 }
    );
  }

  // Idempotency: check if already processed
  const existing = await db
    .select({ id: inboundEmails.id, processingStatus: inboundEmails.processingStatus })
    .from(inboundEmails)
    .where(eq(inboundEmails.graphMessageId, internetMessageId));

  if (existing.length > 0) {
    return NextResponse.json(
      { received: true, status: existing[0].processingStatus, duplicate: true },
      { status: 200 }
    );
  }

  // Parse received timestamp
  let receivedAt: Date;
  try {
    receivedAt = new Date(receivedDateTime);
    if (isNaN(receivedAt.getTime())) throw new Error("Invalid date");
  } catch {
    return NextResponse.json({ error: "Invalid receivedDateTime format" }, { status: 400 });
  }

  // Insert with PENDING status
  const [inserted] = await db
    .insert(inboundEmails)
    .values({
      graphMessageId: internetMessageId,
      graphConversationId: conversationId,
      fromAddress: from,
      subject,
      bodyText: bodyText ?? null,
      bodyHtml: bodyHtml ?? bodyContent ?? null,
      receivedAt,
      processingStatus: "PENDING",
    })
    .returning();

  // Try to match via graphConversationId
  const [matchedOutreach] = await db
    .select({ id: facilityOutreaches.id })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.graphConversationId, conversationId));

  if (matchedOutreach) {
    // Update inbound email as MATCHED
    await db
      .update(inboundEmails)
      .set({
        processingStatus: "MATCHED",
        matchedOutreachId: matchedOutreach.id,
      })
      .where(eq(inboundEmails.id, inserted.id));

    // Update outreach to REPLIED
    await db
      .update(facilityOutreaches)
      .set({
        status: "REPLIED",
        repliedAt: new Date(),
        replyRaw: bodyText ?? bodyHtml ?? null,
      })
      .where(eq(facilityOutreaches.id, matchedOutreach.id));

    return NextResponse.json({ received: true, status: "MATCHED" }, { status: 200 });
  } else {
    // No match — mark as FAILED
    await db
      .update(inboundEmails)
      .set({
        processingStatus: "FAILED",
        failureReason: `No matching outreach for conversationId: ${conversationId}`,
      })
      .where(eq(inboundEmails.id, inserted.id));

    return NextResponse.json(
      { received: true, status: "FAILED", reason: `No matching outreach for conversationId: ${conversationId}` },
      { status: 200 }
    );
  }
}
