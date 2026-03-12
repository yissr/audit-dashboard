"use client";

import { useTransition } from "react";
import { updateOutreachStatus } from "../actions";
import { type OutreachStatus } from "@/lib/outreach-transitions";

const STATUS_OPTIONS: OutreachStatus[] = [
  "DRAFT",
  "SENT",
  "REPLIED",
  "INCOMPLETE",
  "DONE",
];

const statusColors: Record<OutreachStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-yellow-100 text-yellow-700",
  REPLIED: "bg-blue-100 text-blue-700",
  INCOMPLETE: "bg-red-100 text-red-700",
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

  const safeStatus: OutreachStatus = STATUS_OPTIONS.includes(currentStatus as OutreachStatus)
    ? (currentStatus as OutreachStatus)
    : "DRAFT";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as OutreachStatus;
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
