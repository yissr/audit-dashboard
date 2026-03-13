import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isGraphConfigured(): boolean {
  return !!(
    process.env.GRAPH_CLIENT_ID &&
    process.env.GRAPH_CLIENT_SECRET &&
    process.env.GRAPH_TENANT_ID &&
    process.env.GRAPH_SENDER_EMAIL
  );
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const tenantId = process.env.GRAPH_TENANT_ID!;
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GRAPH_CLIENT_ID!,
        client_secret: process.env.GRAPH_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph token fetch failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

export async function sendGraphEmail(options: {
  to: string;
  cc?: string[];
  subject: string;
  htmlBody: string;
  attachments?: Array<{ name: string; contentType: string; contentBytes: string }>;
}): Promise<{ messageId: string; conversationId: string }> {
  if (!isGraphConfigured()) {
    // Dry-run: write to test-data/
    const outDir = join(process.cwd(), "test-data");
    mkdirSync(outDir, { recursive: true });
    const filePath = join(outDir, `outreach-email-${Date.now()}.html`);
    writeFileSync(filePath, options.htmlBody, "utf-8");
    console.log(`[graph-client dry-run] Email to ${options.to} written to ${filePath}`);
    return {
      messageId: `dry-run-msg-${Date.now()}`,
      conversationId: `dry-run-conv-${Date.now()}`,
    };
  }

  const token = await getAccessToken();
  const senderEmail = process.env.GRAPH_SENDER_EMAIL!;

  const message: Record<string, unknown> = {
    subject: options.subject,
    body: { contentType: "HTML", content: options.htmlBody },
    toRecipients: [{ emailAddress: { address: options.to } }],
    ccRecipients: (options.cc ?? []).map((a) => ({ emailAddress: { address: a } })),
  };

  if (options.attachments && options.attachments.length > 0) {
    message.attachments = options.attachments.map((a) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: a.name,
      contentType: a.contentType,
      contentBytes: a.contentBytes,
    }));
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail failed: ${res.status} ${text}`);
  }

  // Graph sendMail returns 202 with no body
  return {
    messageId: `graph-${Date.now()}`,
    conversationId: `conv-${Date.now()}`,
  };
}
