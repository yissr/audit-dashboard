"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { previewFile, ingestBatch } from "../actions";
import type { FacilityMapping } from "../actions";

interface PreviewFacility {
  name: string;
  employeeCount: number;
  existingId: string | null;
}

interface FacilityRow extends PreviewFacility {
  action: "create" | "match";
  newName: string;
  selectedExistingId: string;
}

export function NewBatchForm({
  carriers,
  existingFacilities,
}: {
  carriers: { id: string; name: string }[];
  existingFacilities: { id: string; name: string }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState("");
  const [facilityRows, setFacilityRows] = useState<FacilityRow[]>([]);
  const [carrierId, setCarrierId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleFilePreview() {
    const file = fileRef.current?.files?.[0];
    if (!file || !carrierId) {
      setError("Please select a carrier and a file.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await previewFile(fd);

      setDetectedFormat(result.detectedFormat);
      setFacilityRows(
        result.facilities.map((f) => ({
          ...f,
          action: f.existingId ? "match" : "create",
          newName: f.name,
          selectedExistingId: f.existingId ?? "",
        }))
      );
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  function updateRow(index: number, updates: Partial<FacilityRow>) {
    setFacilityRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
  }

  async function handleSubmit() {
    // Validate all rows
    for (const row of facilityRows) {
      if (row.action === "match" && !row.selectedExistingId) {
        setError(`Please select an existing facility for "${row.name}"`);
        return;
      }
      if (row.action === "create" && !row.newName.trim()) {
        setError(`Facility name cannot be empty for "${row.name}"`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const mappings: FacilityMapping[] = facilityRows.map((row) => ({
        detectedName: row.name,
        action: row.action,
        newName: row.action === "create" ? row.newName.trim() : undefined,
        existingId: row.action === "match" ? row.selectedExistingId : undefined,
      }));

      const fd = new FormData();
      fd.set("carrierId", carrierId);
      fd.set("file", fileRef.current!.files![0]);
      fd.set("facilityMappings", JSON.stringify(mappings));

      const result = await ingestBatch(fd);
      router.push(`/batches/${result.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="carrierId">Carrier *</Label>
              <select
                name="carrierId"
                id="carrierId"
                className="w-full border rounded-md px-3 py-2 text-sm"
                required
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value)}
              >
                <option value="">Select a carrier...</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {carriers.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  No carriers yet.{" "}
                  <a href="/carriers/new" className="underline">
                    Add a carrier first.
                  </a>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="file">Carrier File (CSV or XLSX) *</Label>
              <input
                id="file"
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                required
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Format is auto-detected (Mo Census, Avid, Momentous, and standard CSV/XLSX supported).
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={handleFilePreview}
              disabled={loading}
            >
              {loading ? "Analyzing file..." : "Preview Facilities"}
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Detected format: <span className="font-bold">{detectedFormat}</span>
                </p>
                <p className="text-sm text-gray-500">
                  {facilityRows.length} facilities, {facilityRows.reduce((s, r) => s + r.employeeCount, 0)} employees (members only)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
              >
                Back
              </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Facility</th>
                    <th className="text-right px-3 py-2 font-medium w-20">Employees</th>
                    <th className="text-left px-3 py-2 font-medium w-52">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {facilityRows.map((row, i) => (
                    <tr key={row.name} className="border-t">
                      <td className="px-3 py-2">
                        {row.action === "create" ? (
                          <input
                            type="text"
                            value={row.newName}
                            onChange={(e) => updateRow(i, { newName: e.target.value })}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          <span className="text-gray-600">{row.name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.employeeCount}</td>
                      <td className="px-3 py-2">
                        <select
                          value={row.action === "match" ? row.selectedExistingId : "__create__"}
                          onChange={(e) => {
                            if (e.target.value === "__create__") {
                              updateRow(i, {
                                action: "create",
                                newName: row.name,
                                selectedExistingId: "",
                              });
                            } else {
                              updateRow(i, {
                                action: "match",
                                selectedExistingId: e.target.value,
                              });
                            }
                          }}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="__create__">Create new facility</option>
                          {existingFacilities.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {facilityRows.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No facilities found in file.</p>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || facilityRows.length === 0}
            >
              {submitting ? "Uploading..." : "Upload & Ingest"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
