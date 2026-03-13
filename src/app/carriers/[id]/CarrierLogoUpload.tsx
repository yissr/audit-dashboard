"use client";

import { useRef, useState, useTransition } from "react";
import { updateCarrierLogo } from "../actions";

export default function CarrierLogoUpload({
  carrierId,
  currentLogoUrl,
}: {
  carrierId: string;
  currentLogoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setError("Logo must be under 500 KB"); return; }
    if (!file.type.startsWith("image/")) { setError("Must be an image file"); return; }
    setError("");

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      startTransition(async () => {
        await updateCarrierLogo(carrierId, dataUrl);
      });
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(async () => {
      await updateCarrierLogo(carrierId, null);
    });
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        <img src={preview} alt="Carrier logo" className="h-14 w-auto object-contain rounded border bg-white p-1" />
      ) : (
        <div className="h-14 w-20 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 bg-gray-50">
          No logo
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className={`cursor-pointer text-xs px-3 py-1.5 rounded border bg-white hover:bg-gray-50 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
          {isPending ? "Saving..." : preview ? "Change Logo" : "Upload Logo"}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        {preview && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="text-xs text-red-500 hover:underline text-left disabled:opacity-50"
          >
            Remove
          </button>
        )}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}
