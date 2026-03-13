"use client";

import { useState, useTransition } from "react";
import { updateFacilityCcEmails } from "../../actions";

interface Props {
  facilityId: string;
  initialCcEmails: string[];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function CcEmailsEditor({ facilityId, initialCcEmails }: Props) {
  const [cc, setCc] = useState<string[]>(initialCcEmails);
  const [ccInput, setCcInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function addFromInput() {
    const val = ccInput.trim();
    if (val && isValidEmail(val) && !cc.includes(val)) {
      setCc((prev) => [...prev, val]);
      setSaved(false);
    }
    setCcInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addFromInput();
    }
  }

  function removeCc(email: string) {
    setCc((prev) => prev.filter((e) => e !== email));
    setSaved(false);
  }

  function handleSave() {
    setError("");
    startTransition(async () => {
      try {
        await updateFacilityCcEmails(facilityId, cc);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="border rounded px-3 py-1.5 flex flex-wrap gap-1 min-h-[2.5rem]">
        {cc.map((email) => (
          <span key={email} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5">
            {email}
            <button type="button" onClick={() => removeCc(email)} className="text-blue-400 hover:text-blue-600 leading-none">
              &times;
            </button>
          </span>
        ))}
        <input
          type="email"
          value={ccInput}
          onChange={(e) => { setCcInput(e.target.value); setSaved(false); }}
          onKeyDown={handleKeyDown}
          onBlur={addFromInput}
          placeholder="Add CC email…"
          className="flex-1 min-w-[140px] text-sm outline-none bg-transparent"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 text-sm bg-[#1B2A4A] text-white rounded hover:bg-[#2a3f6b] disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save CC Recipients"}
        </button>
        {saved && <span className="text-xs text-green-600">&#10003; Saved</span>}
      </div>
    </div>
  );
}
