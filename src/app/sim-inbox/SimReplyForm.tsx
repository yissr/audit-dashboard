"use client";

import { useState, useTransition } from "react";
import { submitSimReply } from "./actions";

interface Props {
  simOutboxId: string;
}

export default function SimReplyForm({ simOutboxId }: Props) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return <span className="text-xs text-green-600 font-medium">&#10003; Reply submitted</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs border border-blue-300 text-blue-600 rounded px-2 py-0.5 hover:bg-blue-50"
      >
        Reply
      </button>
    );
  }

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      try {
        await submitSimReply(simOutboxId, replyText);
        setDone(true);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit reply");
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        rows={5}
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Type the facility's reply here…"
        className="w-full border rounded px-3 py-2 text-sm font-mono resize-y"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !replyText.trim()}
          className="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit Reply"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs border rounded px-3 py-1 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
