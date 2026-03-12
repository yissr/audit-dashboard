"use client";

import { useTransition } from "react";
import { updateOutreachStatus } from "../actions";

const STATUS_OPTIONS = [
  "PENDING_OUTREACH",
  "AWAITING_REPLY",
  "REPLIED",
  "IN_REVIEW",
  "INCOMPLETE",
  "SNOOZED",
  "DONE",
] as const;

type FacilityStatus = (typeof STATUS_OPTIONS)[number];

const statusColors: Record<FacilityStatus, string> = {
  PENDING_OUTREACH: "bg-gray-100 text-gray-700",
  AWAITING_REPLY: "bg-yellow-100 text-yellow-700",
  REPLIED: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-orange-100 text-orange-700",
  INCOMPLETE: "bg-red-100 text-red-700",
  SNOOZED: "bg-purple-100 text-purple-700",
  DONE: "bg-green-100 text-green-700",
};

interface OutreachStatusSelectProps {
  outreachId: string;
  currentStatus: string;
}

export default function OutreachStatusSelect({
  outreachId,
  currentStatus,
}: OutreachStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  const safeStatus = STATUS_OPTIONS.includes(currentStatus as FacilityStatus)
    ? (currentStatus as FacilityStatus)
    : "PENDING_OUTREACH";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as FacilityStatus;
    startTransition(async () => {
      await updateOutreachStatus(outreachId, newStatus);
    });
  }

  return (
    <select
      disabled={isPending}
      value={safeStatus}
      onChange={handleChange}
      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer disabled:opacity-50 disabled:cursor-wait ${statusColors[safeStatus]}`}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
