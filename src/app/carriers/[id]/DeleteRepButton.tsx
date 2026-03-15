"use client";

import { useTransition } from "react";
import { deleteRep, getRepBatchCount } from "./reps/actions";

export default function DeleteRepButton({
  repId,
  repName,
  carrierId,
}: {
  repId: string;
  repName: string;
  carrierId: string;
}) {
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    const batchCount = await getRepBatchCount(repId);
    const message =
      batchCount > 0
        ? `${repName} is assigned to ${batchCount} batch${batchCount !== 1 ? "es" : ""}. Removing this rep will unassign them from those batches (including any already submitted). Continue?`
        : `Remove ${repName}?`;
    if (!confirm(message)) return;
    startTransition(async () => {
      await deleteRep(repId, carrierId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-red-500 hover:underline disabled:opacity-50"
    >
      {isPending ? "Removing..." : "Remove"}
    </button>
  );
}
