import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { sendGraphEmail, isGraphConfigured } from "./graph-client";

interface EmailOptions {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  csvAttachment: { filename: string; content: string };
}

export async function sendEmail(options: EmailOptions): Promise<{ dryRun: boolean; filePath?: string }> {
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

  // Dry-run: write files locally
  const outDir = join(process.cwd(), "test-data");
  mkdirSync(outDir, { recursive: true });
  const htmlPath = join(outDir, "submission-email-output.html");
  const csvPath = join(outDir, "submission-email-output.csv");
  writeFileSync(htmlPath, options.html, "utf-8");
  writeFileSync(csvPath, options.csvAttachment.content, "utf-8");
  return { dryRun: true, filePath: htmlPath };
}
