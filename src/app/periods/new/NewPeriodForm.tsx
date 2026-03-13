"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPeriod } from "../actions";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Months 3,6,9,12 overlap with a quarter — medical should go into quarterly period
const QUARTER_MONTHS = new Set([2, 5, 8, 11]); // 0-indexed

function getQuarter(month0: number) {
  return Math.floor(month0 / 3) + 1;
}

function monthDates(year: number, month0: number) {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0); // last day of month
  return {
    name: `${MONTHS[month0]} ${year}`,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function quarterDates(year: number, q: number) {
  const startMonth = (q - 1) * 3;
  const endMonth = startMonth + 2;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0);
  return {
    name: `Q${q} ${year}`,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
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
  const isOverlapMonth = type === "monthly" && QUARTER_MONTHS.has(month);

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("name", preview.name);
      fd.set("startDate", preview.startDate);
      fd.set("endDate", preview.endDate);
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
                {m}{QUARTER_MONTHS.has(i) ? " ⚠" : ""}
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

      {/* Overlap warning */}
      {isOverlapMonth && (
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm text-amber-800">
          <strong>{MONTHS[month]}</strong> is the last month of Q{getQuarter(month)} —
          upload both medical and Guardian files into the <strong>Q{getQuarter(month)} {year}</strong> quarterly
          period instead so deduplication works across both carriers.
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
