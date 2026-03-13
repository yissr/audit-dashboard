"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPeriod } from "../actions";
import {
  isOverlapMonth,
  quarterForMonth,
  lastMonthOfQuarter,
  monthDates,
  quarterDates,
} from "@/lib/period-utils";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function getQuarter(month0: number) {
  return Math.floor(month0 / 3) + 1;
}

export default function NewPeriodForm() {
  const router = useRouter();
  const now = new Date();
  const [type, setType] = useState<"monthly" | "quarterly">("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [quarter, setQuarter] = useState(getQuarter(now.getMonth()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const preview = type === "monthly" ? monthDates(year, month) : quarterDates(year, quarter);

  // Info note for overlap periods
  let linkNote: string | null = null;
  if (type === "monthly" && isOverlapMonth(month)) {
    const q = quarterForMonth(month);
    linkNote = `Auto-links to Q${q} ${year} for cross-carrier deduplication`;
  } else if (type === "quarterly") {
    const lastMonth = lastMonthOfQuarter(quarter);
    linkNote = `Auto-links to ${MONTHS[lastMonth]} ${year} for cross-carrier deduplication`;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("name", preview.name);
      fd.set("startDate", preview.startDate);
      fd.set("endDate", preview.endDate);
      fd.set("periodType", type);
      fd.set("monthOrQuarter", String(type === "monthly" ? month : quarter));
      await createPeriod(fd);
      router.push("/periods");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create period");
      setSubmitting(false);
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-5">
      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium mb-2">Period Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("monthly")}
            className={`px-4 py-2 rounded text-sm font-medium border ${
              type === "monthly"
                ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            Monthly <span className="text-xs opacity-70 ml-1">(Medical)</span>
          </button>
          <button
            type="button"
            onClick={() => setType("quarterly")}
            className={`px-4 py-2 rounded text-sm font-medium border ${
              type === "quarterly"
                ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            Quarterly <span className="text-xs opacity-70 ml-1">(Dental/Vision)</span>
          </button>
        </div>
      </div>

      {/* Year */}
      <div>
        <label className="block text-sm font-medium mb-1">Year</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border rounded px-3 py-2 text-sm w-32"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Month or Quarter */}
      {type === "monthly" ? (
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm w-44"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-1">Quarter</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuarter(q)}
                className={`px-4 py-2 rounded text-sm font-medium border ${
                  quarter === q
                    ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Auto-link info note */}
      {linkNote && (
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800">
          {linkNote}
        </div>
      )}

      {/* Preview */}
      <div className="bg-gray-50 border rounded px-4 py-3 text-sm">
        <div className="font-medium text-gray-700">Will create:</div>
        <div className="mt-1 font-bold text-[#1B2A4A] text-base">{preview.name}</div>
        <div className="text-gray-500 mt-0.5">{preview.startDate} → {preview.endDate}</div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-[#1B2A4A] text-white py-2 rounded text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Creating..." : `Create ${preview.name}`}
      </button>
    </div>
  );
}
