"use client";

import { useTransition } from "react";
import { deleteCarrier } from "../actions";
import { useRouter } from "next/navigation";

export default function DeleteCarrierButton({ carrierId, carrierName }: { carrierId: string; carrierName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm(`Delete ${carrierName}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteCarrier(carrierId);
      router.push("/carriers");
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-sm text-red-500 hover:underline mt-1 disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete Carrier"}
    </button>
  );
}
