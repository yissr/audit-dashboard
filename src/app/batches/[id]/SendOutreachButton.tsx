"use client";

import { useState, useTransition } from "react";
import { sendOutreachEmail } from "./facilities/actions";

interface Props {
  outreachId: string;
  facilityName: string;
  facilityEmail: string | null;
  savedCcEmails: string[];
  periodName: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SendOutreachButton({
  outreachId,
  facilityName,
  facilityEmail,
  savedCcEmails,
  periodName,
}: Props) {
  const defaultSubject = `Workers' Compensation Audit — ${facilityName} — ${periodName}`;
  const defaultBody = `Dear ${facilityName},

We are conducting our workers' compensation audit for ${periodName}. Please review the attached employee list and reply to this email indicating the current employment status of each employee listed.

For any employees who are no longer active, please provide:
- Termination or change effective date
- Reason (Terminated, Transferred, FMLA, LOA, Workers' Comp, Not on Payroll)

Please respond within 10 business days.

Thank you,
Empire Benefit Solutions`;

  const [open, setOpen] = useState(false);
  const [cc, setCc] = useState<string[]>(savedCcEmails);
  const [ccInput, setCcInput] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function addCcFromInput() {
    const val = ccInput.trim();
    if (val && isValidEmail(val) && !cc.includes(val)) {
      setCc((prev) => [...prev, val]);
    }
    setCcInput("");
  }

  function handleCcKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCcFromInput();
    }
  }

  function removeCc(email: string) {
    setCc((prev) => prev.filter((e) => e !== email));
  }

  function handleSend() {
    setError("");
    startTransition(async () => {
      try {
        await sendOutreachEmail(outreachId, cc, subject, body);
        setSent(true);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send email");
      }
    });
  }

  if (sent) {
    return <span className="text-xs text-green-600 font-medium">&#10003; Sent</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={!facilityEmail}
        title={!facilityEmail ? "No contact email on file" : undefined}
        className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Send Email
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
        <h3 className="text-base font-semibold text-[#1B2A4A]">Send Outreach Email</h3>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">To:</label>
          <div className="text-sm text-gray-700 bg-gray-50 border rounded px-3 py-1.5">{facilityEmail}</div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">CC:</label>
          <div className="border rounded px-3 py-1.5 flex flex-wrap gap-1 min-h-[2.5rem]">
            {cc.map((email) => (
              <span key={email} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5">
                {email}
                <button
                  type="button"
                  onClick={() => removeCc(email)}
                  className="text-blue-400 hover:text-blue-600 leading-none"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              type="email"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              onKeyDown={handleCcKeyDown}
              onBlur={addCcFromInput}
              placeholder="Add CC email…"
              className="flex-1 min-w-[140px] text-sm outline-none bg-transparent"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border rounded px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Body:</label>
          <textarea
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border rounded px-3 py-1.5 text-sm font-mono resize-y"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-[#1B2A4A] text-white rounded hover:bg-[#2a3f6b] disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
