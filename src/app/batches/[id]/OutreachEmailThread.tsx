"use client";

import { useState } from "react";

interface OutreachEmailThreadProps {
  sentHtml: string | null;
  sentAt: string | null;
  replyText: string | null;
  repliedAt: string | null;
}

export default function OutreachEmailThread({
  sentHtml,
  sentAt,
  replyText,
  repliedAt,
}: OutreachEmailThreadProps) {
  const [open, setOpen] = useState(false);
  const hasContent = !!(sentHtml || replyText);

  if (!hasContent) {
    return (
      <span className="text-xs text-gray-300 mt-1 block">No emails yet</span>
    );
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        type="button"
      >
        {open ? "▼" : "▶"} Email Thread
      </button>
      {open && (
        <div className="mt-2 space-y-3 text-xs border rounded-md p-3 bg-gray-50 max-w-md">
          {sentHtml && (
            <div>
              <p className="font-medium text-gray-600 mb-1">
                Sent{sentAt ? ` · ${new Date(sentAt).toLocaleDateString()}` : ""}
              </p>
              <div
                className="border rounded bg-white p-2 overflow-auto max-h-48 text-gray-800"
                dangerouslySetInnerHTML={{ __html: sentHtml }}
              />
            </div>
          )}
          {replyText && (
            <div>
              <p className="font-medium text-gray-600 mb-1">
                Reply received{repliedAt ? ` · ${new Date(repliedAt).toLocaleDateString()}` : ""}
              </p>
              <pre className="border rounded bg-white p-2 overflow-auto max-h-48 text-gray-800 whitespace-pre-wrap font-sans">
                {replyText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
