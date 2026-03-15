import { sendGraphEmail, isGraphConfigured } from "./graph-client";

interface EmailOptions {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  csvAttachment: { filename: string; content: string };
}

export async function sendEmail(options: EmailOptions): Promise<{ dryRun: boolean }> {
  if (isGraphConfigured()) {
    await sendGraphEmail({
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      htmlBody: options.html,
      attachments: [
        {
          name: options.csvAttachment.filename,
          contentType: "text/csv",
          contentBytes: Buffer.from(options.csvAttachment.content).toString("base64"),
        },
      ],
    });
    return { dryRun: false };
  }

  // Dry-run: log to console only (filesystem is read-only on Vercel)
  console.log("[email dry-run] Subject:", options.subject, "To:", options.to);
  return { dryRun: true };
}
