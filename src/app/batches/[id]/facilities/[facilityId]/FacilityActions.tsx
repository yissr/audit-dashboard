"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markFacilityDone, markFacilityIncomplete } from "../actions";
import { Button } from "@/components/ui/button";

interface Props {
  outreachId: string;
  batchId: string;
  currentStatus: string;
  classifiedCount: number;
  totalCount: number;
}

export default function FacilityActions({ outreachId, batchId, currentStatus, classifiedCount, totalCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (currentStatus === "DONE") {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-4 py-2 text-sm text-green-700">
        Facility marked as Done
      </div>
    );
  }

  function handleDone() {
    setError("");
    startTransition(async () => {
      try {
        await markFacilityDone(outreachId, batchId);
        router.push(`/batches/${batchId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to mark done");
      }
    });
  }

  function handleIncompleteSubmit() {
    if (!reason.trim()) {
      setError("Please enter a reason.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await markFacilityIncomplete(outreachId, batchId, reason);
        setShowIncomplete(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to mark incomplete");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleDone}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700 text-white text-sm"
        >
          Mark Done ({classifiedCount}/{totalCount} classified)
        </Button>
        <Button
          variant="outline"
          onClick={() => { setShowIncomplete(!showIncomplete); setError(""); }}
          disabled={isPending}
          className="text-sm border-red-300 text-red-600 hover:bg-red-50"
        >
          Mark Incomplete
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showIncomplete && (
        <div className="flex gap-2 items-start mt-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What information is missing?"
            rows={2}
            className="border rounded-md px-3 py-2 text-sm flex-1 resize-none"
          />
          <div className="flex flex-col gap-1">
            <Button onClick={handleIncompleteSubmit} disabled={isPending} className="text-sm bg-red-600 hover:bg-red-700 text-white">
              Confirm
            </Button>
            <Button variant="outline" onClick={() => setShowIncomplete(false)} className="text-sm">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
