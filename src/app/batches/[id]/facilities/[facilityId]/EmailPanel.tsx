"use client";

import { useState } from "react";

export default function EmailPanel({ htmlBody }: { htmlBody: string }) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <div className="shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#1B2A4A] select-none whitespace-nowrap"
        >
          <span className="-rotate-90 inline-block">▾</span>
          Show email
        </button>
      </div>
    );
  }

  return (
    <div className="w-[380px] shrink-0 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sent Email</span>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600 select-none"
        >
          Hide ✕
        </button>
      </div>
      <div className="border rounded-lg bg-white shadow-sm flex-1 overflow-y-auto">
        <div
          className="p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: htmlBody }}
        />
      </div>
    </div>
  );
}
