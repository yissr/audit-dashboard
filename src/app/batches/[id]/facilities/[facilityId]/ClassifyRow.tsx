"use client";

import { useState, useTransition } from "react";
import { classifyEmployee } from "../actions";

const CLASSIFICATIONS = [
  { value: "STILL_EMPLOYED", label: "Still Employed", color: "bg-green-100 text-green-700 hover:bg-green-200" },
  { value: "TERMINATED", label: "Terminated", color: "bg-red-100 text-red-700 hover:bg-red-200" },
  { value: "QUIT", label: "Quit", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  { value: "SICK_LEAVE", label: "Sick Leave", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { value: "FAMILY_LEAVE", label: "Family Leave", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { value: "OTHER", label: "Other", color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
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
  const [showDetails, setShowDetails] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(value: Classification) {
    setSelected(value);
    setShowDetails(true);
    startTransition(async () => {
      await classifyEmployee(recordId, value, notes, effectiveDate);
    });
  }

  function handleDetailsChange() {
    if (!selected) return;
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

      {(showDetails || selected) && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            onBlur={handleDetailsChange}
            placeholder="Effective date"
            className="border rounded px-2 py-1 text-xs w-32"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleDetailsChange}
            placeholder="Notes..."
            className="border rounded px-2 py-1 text-xs w-40"
          />
        </div>
      )}

      {isPending && <span className="text-xs text-gray-400">Saving...</span>}
    </div>
  );
}
