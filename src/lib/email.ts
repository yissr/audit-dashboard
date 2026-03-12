import nodemailer from "nodemailer";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  csvAttachment: { filename: string; content: string };
}

function isDryRun(): boolean {
  return !process.env.SMTP_HOST;
}

export async function sendEmail(options: EmailOptions): Promise<{ dryRun: boolean; filePath?: string }> {
  if (isDryRun()) {
    const outDir = join(process.cwd(), "test-data");
    mkdirSync(outDir, { recursive: true });
    const htmlPath = join(outDir, "submission-email-output.html");
    const csvPath = join(outDir, "submission-email-output.csv");
    writeFileSync(htmlPath, options.html, "utf-8");
    writeFileSync(csvPath, options.csvAttachment.content, "utf-8");
    return { dryRun: true, filePath: htmlPath };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: (Number(process.env.SMTP_PORT) || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: [
      {
        filename: options.csvAttachment.filename,
        content: options.csvAttachment.content,
        contentType: "text/csv",
      },
    ],
  });

  return { dryRun: false };
}
