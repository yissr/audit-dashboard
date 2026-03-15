"use client";

import { useState } from "react";

export default function EmailPanel({ htmlBody }: { htmlBody: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`transition-all duration-200 ${open ? "w-full lg:w-[420px] shrink-0" : "w-auto shrink-0"}`}>
      <div className="sticky top-[72px]">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-[#1B2A4A] mb-2 select-none"
        >
          <span className={`transition-transform ${open ? "rotate-0" : "-rotate-90"}`}>▾</span>
          {open ? "Hide outreach email" : "Show outreach email"}
        </button>
        {open && (
          <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Sent Email
            </div>
            <div
              className="overflow-y-auto p-4 text-sm max-h-[calc(100vh-180px)]"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
