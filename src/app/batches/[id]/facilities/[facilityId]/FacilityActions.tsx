"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markFacilityDone, markFacilityIncomplete, sendIncompleteNotice, revertIncomplete } from "../actions";
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

  // After incomplete is marked: null = not yet shown, "pending" = show email prompt, "sent" = email sent, "skipped" = not now
  const [emailStep, setEmailStep] = useState<null | "pending" | "sent" | "skipped">(null);
  const [pendingReason, setPendingReason] = useState("");

  if (currentStatus === "DONE") {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-4 py-2 text-sm text-green-700">
        Facility marked as Done
      </div>
    );
  }

  if (currentStatus === "INCOMPLETE") {
    return (
      <div className="space-y-2">
        {emailStep === "pending" && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md space-y-2">
            <p className="text-sm text-yellow-800 font-medium">Send notification email to facility?</p>
            <div className="flex gap-2">
              <Button onClick={handleSendEmail} disabled={isPending} className="text-sm bg-blue-600 hover:bg-blue-700 text-white">
                Send Email Now
              </Button>
              <Button variant="outline" onClick={() => setEmailStep("skipped")} disabled={isPending} className="text-sm">
                Not Now
              </Button>
            </div>
          </div>
        )}
        {emailStep === "sent" && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 font-medium">
            <span>&#10003;</span> Email sent
          </div>
        )}
        {emailStep === "skipped" && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
            <span>&#9888;</span> Email not sent
            <button onClick={() => setEmailStep("pending")} className="underline text-blue-600 hover:text-blue-800 ml-1">Send now</button>
          </div>
        )}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 font-medium">⚠ Marked Incomplete</span>
          <Button
            variant="outline"
            onClick={() => {
              startTransition(async () => {
                try { await revertIncomplete(outreachId, batchId); router.refresh(); }
                catch (e) { setError(e instanceof Error ? e.message : "Failed to revert"); }
              });
            }}
            disabled={isPending}
            className="text-sm border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Undo Incomplete
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
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
        setPendingReason(reason.trim());
        setShowIncomplete(false);
        setEmailStep("pending");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to mark incomplete");
      }
    });
  }

  function handleSendEmail() {
    setError("");
    startTransition(async () => {
      try {
        await sendIncompleteNotice(outreachId, pendingReason);
        setEmailStep("sent");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send email");
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
          onClick={() => { setShowIncomplete(!showIncomplete); setError(""); setEmailStep(null); }}
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

      {emailStep === "pending" && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md space-y-2">
          <p className="text-sm text-yellow-800 font-medium">Marked incomplete. Send notification email to facility now?</p>
          <div className="flex gap-2">
            <Button
              onClick={handleSendEmail}
              disabled={isPending}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send Email Now
            </Button>
            <Button
              variant="outline"
              onClick={() => setEmailStep("skipped")}
              disabled={isPending}
              className="text-sm"
            >
              Not Now
            </Button>
          </div>
        </div>
      )}

      {emailStep === "sent" && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 font-medium">
          <span>&#10003;</span> Email sent
        </div>
      )}

      {emailStep === "skipped" && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
          <span>&#9888;</span> Email not sent yet
          <button
            onClick={() => setEmailStep("pending")}
            className="underline text-blue-600 hover:text-blue-800 ml-1"
          >
            Send now
          </button>
        </div>
      )}
    </div>
  );
}
