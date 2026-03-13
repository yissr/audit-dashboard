"use client";

import { useTransition, useState } from "react";
import { snoozeFacility, wakeFacility, logReminder } from "../actions";

interface FacilityRowActionsProps {
  outreachId: string;
  status: string;
  snoozeUntil: string | null;
  reminderCount: number;
  lastReminderAt: string | null;
}

export default function FacilityRowActions({
  outreachId,
  status,
  snoozeUntil,
  reminderCount,
  lastReminderAt,
}: FacilityRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showSnooze, setShowSnooze] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState("");
  const [snoozeError, setSnoozeError] = useState("");

  const now = new Date();
  const isSnoozed = snoozeUntil != null && new Date(snoozeUntil) > now;
  const isDone = status === "DONE";
  const canRemind = !isSnoozed && !isDone;

  // Max snooze date = 1 month from today
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 1);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  // Min date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  function handleSnooze() {
    if (!snoozeDate) { setSnoozeError("Pick a date"); return; }
    setSnoozeError("");
    startTransition(async () => {
      await snoozeFacility(outreachId, snoozeDate);
      setShowSnooze(false);
      setSnoozeDate("");
    });
  }

  function handleWake() {
    startTransition(async () => { await wakeFacility(outreachId); });
  }

  function handleReminder() {
    startTransition(async () => { await logReminder(outreachId); });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        {isSnoozed ? (
          <>
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Snoozed until {snoozeUntil ? new Date(snoozeUntil).toLocaleDateString() : "—"}
            </span>
            <button
              onClick={handleWake}
              disabled={isPending}
              className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50"
            >
              Wake
            </button>
          </>
        ) : !isDone ? (
          <>
            {showSnooze ? (
              <div className="flex items-center gap-1 flex-wrap">
                <input
                  type="date"
                  value={snoozeDate}
                  min={minDateStr}
                  max={maxDateStr}
                  onChange={(e) => { setSnoozeDate(e.target.value); setSnoozeError(""); }}
                  className="border rounded px-2 py-0.5 text-xs"
                />
                <button
                  onClick={handleSnooze}
                  disabled={isPending || !snoozeDate}
                  className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50"
                >
                  Set
                </button>
                <button
                  onClick={() => { setShowSnooze(false); setSnoozeError(""); }}
                  className="text-xs px-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
                {snoozeError && <span className="text-xs text-red-500">{snoozeError}</span>}
              </div>
            ) : (
              <button
                onClick={() => setShowSnooze(true)}
                disabled={isPending}
                className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50"
              >
                Snooze
              </button>
            )}
          </>
        ) : null}

        {canRemind && (
          <button
            onClick={handleReminder}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
          >
            Send Reminder
          </button>
        )}
      </div>

      {reminderCount > 0 && (
        <span className="text-xs text-gray-400">
          {reminderCount} reminder{reminderCount !== 1 ? "s" : ""}
          {lastReminderAt ? ` · last ${new Date(lastReminderAt).toLocaleDateString()}` : ""}
        </span>
      )}
    </div>
  );
}
