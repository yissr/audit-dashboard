"use client";

import { useTransition, useState } from "react";
import { snoozeFacility, wakeFacility, logReminder } from "../actions";

const SNOOZE_OPTIONS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

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

  // Snoozed is now a column modifier: snoozeUntil != null and in the future
  const now = new Date();
  const isSnoozed = snoozeUntil != null && new Date(snoozeUntil) > now;
  const isDone = status === "DONE";
  const canRemind = !isSnoozed && !isDone;

  function handleSnooze(days: number) {
    startTransition(async () => {
      await snoozeFacility(outreachId, days);
      setShowSnooze(false);
    });
  }

  function handleWake() {
    startTransition(async () => {
      await wakeFacility(outreachId);
    });
  }

  function handleReminder() {
    startTransition(async () => {
      await logReminder(outreachId);
    });
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
              <div className="flex items-center gap-1">
                {SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => handleSnooze(opt.days)}
                    disabled={isPending}
                    className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50"
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowSnooze(false)}
                  className="text-xs px-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
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
