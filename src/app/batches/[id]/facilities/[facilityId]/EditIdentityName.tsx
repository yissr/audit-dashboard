"use client";

import { useState, useTransition } from "react";
import { updateIdentityName } from "../actions";

interface EditIdentityNameProps {
  identityId: string;
  currentName: string;
}

export default function EditIdentityName({ identityId, currentName }: EditIdentityNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    setValue(currentName);
    setError("");
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setError("");
  }

  function handleSave() {
    if (!value.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await updateIdentityName(identityId, value);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save name");
      }
    });
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="font-medium text-sm">{currentName}</span>
        <button
          onClick={handleEdit}
          className="text-gray-400 hover:text-gray-600 text-xs px-1"
          title="Edit name"
          aria-label="Edit name"
        >
          ✎
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1">
        <input
          className="border border-gray-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          autoFocus
          disabled={isPending}
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="text-xs text-gray-500 hover:text-gray-700 px-1 disabled:opacity-50"
        >
          Cancel
        </button>
      </span>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
