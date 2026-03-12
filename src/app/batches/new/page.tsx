export const dynamic = "force-dynamic";

import { listCarriers } from "@/app/carriers/actions";
import { ingestBatch } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

export default async function NewBatchPage() {
  const carrierList = await listCarriers();

  async function handleIngest(formData: FormData) {
    "use server";
    const result = await ingestBatch(formData);
    redirect(`/batches/${result.batchId}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Upload Carrier File</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={handleIngest} className="space-y-4" encType="multipart/form-data">
            <div>
              <Label htmlFor="carrierId">Carrier *</Label>
              <select name="carrierId" id="carrierId" className="w-full border rounded-md px-3 py-2 text-sm" required>
                <option value="">Select a carrier...</option>
                {carrierList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {carrierList.length === 0 && (
                <p className="text-sm text-red-500 mt-1">No carriers yet. <a href="/carriers/new" className="underline">Add a carrier first.</a></p>
              )}
            </div>
            <div>
              <Label htmlFor="file">Carrier File (CSV or XLSX) *</Label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                required
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Format is auto-detected (Mo Census, Avid, Momentous, and standard CSV/XLSX supported).</p>
            </div>
            <Button type="submit" className="w-full">Upload & Ingest</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
