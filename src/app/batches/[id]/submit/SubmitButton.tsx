"use client";

import { useState } from "react";
import { submitBatch } from "./actions";
import { Button } from "@/components/ui/button";

export default function SubmitButton({ batchId, disabled }: { batchId: string; disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; dryRun: boolean; error?: string } | null>(null);

  async function handleSubmit() {
    if (!confirm("Are you sure you want to submit this batch to the carrier?")) return;
    setLoading(true);
    try {
      const res = await submitBatch(batchId);
      setResult(res);
    } catch (e) {
      setResult({ success: false, dryRun: false, error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  if (result?.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Batch submitted successfully!
        {result.dryRun && (
          <span className="block mt-1 text-green-600">
            (Dry-run mode — email saved to test-data/ instead of sending)
          </span>
        )}
      </div>
    );
  }

  if (result && !result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Failed to submit: {result.error}
      </div>
    );
  }

  return (
    <Button
      onClick={handleSubmit}
      disabled={disabled || loading}
      className="bg-[#1B2A4A] hover:bg-[#2a3f6b] text-white"
    >
      {loading ? "Sending..." : "Send to Carrier"}
    </Button>
  );
}
