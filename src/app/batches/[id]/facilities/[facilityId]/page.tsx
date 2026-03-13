export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditBatches, auditRecords, carriers, facilities, facilityOutreaches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import ClassifyRow from "./ClassifyRow";
import FacilityActions from "./FacilityActions";

const classificationColors: Record<string, string> = {
  STILL_EMPLOYED: "bg-green-100 text-green-700",
  TERMINATED:     "bg-red-100 text-red-700",
  TRANSFERRED:    "bg-cyan-100 text-cyan-700",
  FMLA:           "bg-purple-100 text-purple-700",
  LOA:            "bg-yellow-100 text-yellow-700",
  WORKERS_COMP:   "bg-orange-100 text-orange-700",
  NOT_ON_PAYROLL: "bg-gray-100 text-gray-700",
};

const classificationLabels: Record<string, string> = {
  STILL_EMPLOYED: "Still Employed",
  TERMINATED:     "Terminated",
  TRANSFERRED:    "Transferred",
  FMLA:           "FMLA",
  LOA:            "LOA",
  WORKERS_COMP:   "Workers' Comp",
  NOT_ON_PAYROLL: "Not on Payroll",
};

export default async function ClassificationPage({
  params,
}: {
  params: Promise<{ id: string; facilityId: string }>;
}) {
  const { id: batchId, facilityId } = await params;

  const [batch] = await db
    .select({ id: auditBatches.id, sourceFile: auditBatches.sourceFile, carrierName: carriers.name })
    .from(auditBatches)
    .leftJoin(carriers, eq(auditBatches.carrierId, carriers.id))
    .where(eq(auditBatches.id, batchId));

  if (!batch) notFound();

  const [facility] = await db.select().from(facilities).where(eq(facilities.id, facilityId));
  if (!facility) notFound();

  const [outreach] = await db
    .select()
    .from(facilityOutreaches)
    .where(and(eq(facilityOutreaches.batchId, batchId), eq(facilityOutreaches.facilityId, facilityId)));

  const records = await db
    .select()
    .from(auditRecords)
    .where(and(eq(auditRecords.batchId, batchId), eq(auditRecords.facilityId, facilityId)))
    .orderBy(auditRecords.employeeName);

  const classifiedCount = records.filter((r) => r.classification !== null).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/batches/${batchId}`} className="text-sm text-blue-600 hover:underline">
          ← {batch.carrierName} · {batch.sourceFile}
        </Link>
        <h1 className="text-2xl font-bold text-[#1B2A4A] mt-1">{facility.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {classifiedCount} / {records.length} employees classified
          {outreach && <span className="ml-3">· Status: <span className="font-medium">{outreach.status}</span></span>}
        </p>
        {outreach?.incompleteReason && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 inline-block">
            Incomplete reason: {outreach.incompleteReason}
          </div>
        )}
      </div>

      {outreach && (
        <FacilityActions
          outreachId={outreach.id}
          batchId={batchId}
          currentStatus={outreach.status ?? "DRAFT"}
          classifiedCount={classifiedCount}
          totalCount={records.length}
        />
      )}

      <div className="space-y-3">
        {records.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-gray-400">No employees in this facility.</CardContent></Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} className={record.classification ? "border-l-4 border-l-green-400" : ""}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{record.employeeName}</div>
                    {record.policyNumber && (
                      <div className="text-xs text-gray-400 mt-0.5">ID: {record.policyNumber}</div>
                    )}
                    {record.classification && (
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${classificationColors[record.classification]}`}>
                        {classificationLabels[record.classification]}
                        {record.effectiveDate && ` · ${new Date(record.effectiveDate).toLocaleDateString()}`}
                      </span>
                    )}
                    {record.classificationNotes && (
                      <div className="text-xs text-gray-500 mt-1 italic">{record.classificationNotes}</div>
                    )}
                  </div>
                  <ClassifyRow
                    recordId={record.id}
                    currentClassification={record.classification}
                    currentNotes={record.classificationNotes ?? ""}
                    currentEffectiveDate={
                      record.effectiveDate
                        ? new Date(record.effectiveDate).toISOString().split("T")[0]
                        : ""
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
