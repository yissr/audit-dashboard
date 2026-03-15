export const dynamic = "force-dynamic";

import { db } from "@/db";
import { simOutbox } from "@/db/schema";
import { desc } from "drizzle-orm";
import SimReplyForm from "./SimReplyForm";

export default async function SimInboxPage() {
  const entries = await db
    .select()
    .from(simOutbox)
    .orderBy(desc(simOutbox.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#1B2A4A]">⚡ Simulation Inbox</h1>
        <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
          Simulation Mode
        </span>
      </div>

      {entries.length === 0 && (
        <p className="text-sm text-gray-500">No simulated emails sent yet. Enable simulation mode and send an outreach email.</p>
      )}

      {entries.map((entry) => (
        <div key={entry.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm text-[#1B2A4A]">{entry.facilityName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{entry.subject}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                To: {entry.toAddress} &middot; Sent: {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
              </p>
            </div>
            {entry.entryType === "carrier_submission" ? (
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                Carrier Submission
              </span>
            ) : entry.repliedAt ? (
              <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                &#10003; Replied
              </span>
            ) : (
              <span className="text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                Awaiting Reply
              </span>
            )}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-blue-600 hover:underline">View Email</summary>
            <div
              className="mt-2 border rounded p-3 bg-gray-50 text-sm overflow-auto max-h-64"
              dangerouslySetInnerHTML={{ __html: entry.htmlBody }}
            />
          </details>

          {entry.entryType !== "carrier_submission" && !entry.repliedAt && (
            <SimReplyForm simOutboxId={entry.id} />
          )}
        </div>
      ))}
    </div>
  );
}
