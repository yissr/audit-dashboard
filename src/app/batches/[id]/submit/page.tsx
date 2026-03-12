export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSubmissionData, generateSubmissionEmail, generateSubmissionCsv } from "./actions";
import SubmitButton from "./SubmitButton";

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSubmissionData(id);
  if (!data) notFound();

  const { batch, terminations } = data;
  const alreadySubmitted = batch.status === "SUBMITTED";
  const noTerminations = terminations.length === 0;
  const carrierName = batch.carrierName ?? "Unknown Carrier";

  // Group by facility
  const grouped = new Map<string, typeof terminations>();
  for (const t of terminations) {
    const list = grouped.get(t.facilityName) || [];
    list.push(t);
    grouped.set(t.facilityName, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Submit to Carrier</h1>
          <p className="text-sm text-gray-500 mt-1">
            {carrierName} · {batch.sourceFile}
          </p>
        </div>
        <Link href={`/batches/${id}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Batch
        </Link>
      </div>

      {alreadySubmitted && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          This batch was already submitted on{" "}
          {batch.submittedAt ? new Date(batch.submittedAt).toLocaleString() : "unknown date"}.
        </div>
      )}

      {noTerminations && !alreadySubmitted && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          No classified terminations found in this batch. Classify employees before submitting.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">
            Terminations Summary ({terminations.length} total)
          </h2>
          {Array.from(grouped.entries()).map(([facility, records]) => (
            <div key={facility} className="mb-6">
              <h3 className="font-medium text-[#1B2A4A] mb-2">
                {facility}{" "}
                <Badge variant="secondary">{records.length}</Badge>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium">Employee</th>
                      <th className="text-left py-2 px-3 font-medium">Classification</th>
                      <th className="text-left py-2 px-3 font-medium">Effective Date</th>
                      <th className="text-left py-2 px-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-3">{r.employeeName}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">{r.classification}</Badge>
                        </td>
                        <td className="py-2 px-3 text-gray-500">{r.effectiveDate || "—"}</td>
                        <td className="py-2 px-3 text-gray-500">{r.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {!alreadySubmitted && (
        <div className="flex justify-end">
          <SubmitButton batchId={id} disabled={noTerminations} />
        </div>
      )}
    </div>
  );
}
