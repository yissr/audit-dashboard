"use client";

import { useState, useTransition } from "react";
import { setReminderSettings } from "@/app/settings/actions";

interface Props {
  firstReminderDays: number;
  betweenRemindersDays: number;
  maxReminders: number;
}

export default function ReminderSettings({ firstReminderDays, betweenRemindersDays, maxReminders }: Props) {
  const [first, setFirst] = useState(String(firstReminderDays));
  const [between, setBetween] = useState(String(betweenRemindersDays));
  const [max, setMax] = useState(String(maxReminders));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const f = parseInt(first, 10);
    const b = parseInt(between, 10);
    const m = parseInt(max, 10);
    if (isNaN(f) || isNaN(b) || isNaN(m) || f < 1 || b < 1 || m < 1) {
      setError("All values must be positive numbers.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await setReminderSettings(f, b, m);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-md">
      <p className="text-sm text-gray-500">
        Automated reminders run daily. Configure when they are sent to facilities that have not replied.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Days after initial send before first reminder
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={first}
              onChange={(e) => { setFirst(e.target.value); setSaved(false); }}
              className="border rounded-md px-3 py-1.5 text-sm w-24"
            />
            <span className="text-sm text-gray-500">days</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Days between subsequent reminders
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={between}
              onChange={(e) => { setBetween(e.target.value); setSaved(false); }}
              className="border rounded-md px-3 py-1.5 text-sm w-24"
            />
            <span className="text-sm text-gray-500">days</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum number of reminders per facility
          </label>
          <input
            type="number"
            min={1}
            value={max}
            onChange={(e) => { setMax(e.target.value); setSaved(false); }}
            className="border rounded-md px-3 py-1.5 text-sm w-24"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 bg-[#1B2A4A] text-white text-sm rounded-md hover:bg-[#243660] disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
      </div>
    </div>
  );
}
