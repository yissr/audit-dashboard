"use client";

import { useState, useTransition } from "react";
import { classifyEmployee } from "../actions";

const CLASSIFICATIONS = [
  { value: "STILL_EMPLOYED", label: "Still Employed",   color: "bg-green-100 text-green-700 hover:bg-green-200" },
  { value: "TERMINATED",     label: "Terminated",       color: "bg-red-100 text-red-700 hover:bg-red-200" },
  { value: "TRANSFERRED",    label: "Transferred",      color: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200" },
  { value: "QUIT",           label: "Quit / Vol. Term", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  { value: "FMLA",           label: "FMLA",             color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { value: "STD",            label: "STD",              color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { value: "OTHER_LOA",      label: "Other LOA",        color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
  { value: "OTHER",          label: "Other",            color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
] as const;

type Classification = (typeof CLASSIFICATIONS)[number]["value"];

interface Props {
  recordId: string;
  currentClassification: string | null;
  currentNotes: string;
  currentEffectiveDate: string;
}

export default function ClassifyRow({ recordId, currentClassification, currentNotes, currentEffectiveDate }: Props) {
  const [selected, setSelected] = useState<Classification | null>(currentClassification as Classification | null);
  const [notes, setNotes] = useState(currentNotes);
  const [effectiveDate, setEffectiveDate] = useState(currentEffectiveDate);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const dateRequired = selected !== null && selected !== "STILL_EMPLOYED";

  function handleSelect(value: Classification) {
    setSelected(value);
    setError("");
    if (value !== "STILL_EMPLOYED" && !effectiveDate) return;
    startTransition(async () => {
      await classifyEmployee(recordId, value, notes, effectiveDate);
    });
  }

  function handleSave() {
    if (!selected) return;
    if (dateRequired && !effectiveDate) {
      setError("Effective date is required.");
      return;
    }
    setError("");
    startTransition(async () => {
      await classifyEmployee(recordId, selected, notes, effectiveDate);
    });
  }

  return (
    <div className="flex flex-col gap-2 items-end min-w-fit">
      <div className="flex flex-wrap gap-1 justify-end">
        {CLASSIFICATIONS.map((c) => (
          <button
            key={c.value}
            onClick={() => handleSelect(c.value)}
            disabled={isPending}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${c.color} ${
              selected === c.value ? "ring-2 ring-offset-1 ring-gray-400 font-bold" : "opacity-70"
            } disabled:opacity-50`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <div className="flex flex-col items-end gap-0.5">
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => { setEffectiveDate(e.target.value); setError(""); }}
              onBlur={handleSave}
              className={`border rounded px-2 py-1 text-xs w-32 ${dateRequired && !effectiveDate ? "border-red-400" : ""}`}
            />
            {dateRequired && !effectiveDate && (
              <span className="text-xs text-red-500">Required</span>
            )}
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSave}
            placeholder="Notes..."
            className="border rounded px-2 py-1 text-xs w-40"
          />
        </div>
      )}

      {error && <span className="text-xs text-red-500">{error}</span>}
      {isPending && <span className="text-xs text-gray-400">Saving...</span>}
    </div>
  );
}
