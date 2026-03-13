export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditBatches, auditRecords, auditPeriods, carriers, facilities, facilityOutreaches, employeeIdentities } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import ClassifyRow from "./ClassifyRow";
import FacilityActions from "./FacilityActions";
import EditIdentityName from "./EditIdentityName";

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
  searchParams,
}: {
  params: Promise<{ id: string; facilityId: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { id: batchId, facilityId } = await params;
  const { show } = await searchParams;
  const showRemoved = show === "removed";

  const [batch] = await db
    .select({
      id: auditBatches.id,
      sourceFile: auditBatches.sourceFile,
      carrierName: carriers.name,
      periodId: auditBatches.periodId,
    })
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

  // If batch has a period, load identities for this (period, facility) — including linked period
  let identityMap = new Map<string, typeof employeeIdentities.$inferSelect>();
  if (batch.periodId) {
    let linkedPeriodId: string | null = null;
    const [periodRow] = await db
      .select({ linkedPeriodId: auditPeriods.linkedPeriodId })
      .from(auditPeriods)
      .where(eq(auditPeriods.id, batch.periodId));
    linkedPeriodId = periodRow?.linkedPeriodId ?? null;

    const periodIds = [batch.periodId!, linkedPeriodId].filter((x): x is string => x !== null);
    const identitiesForFacility = await db
      .select()
      .from(employeeIdentities)
      .where(
        and(
          inArray(employeeIdentities.periodId, periodIds),
          eq(employeeIdentities.facilityId, facilityId)
        )
      )
      .orderBy(employeeIdentities.canonicalName);

    for (const identity of identitiesForFacility) {
      identityMap.set(identity.id, identity);
    }
  }

  const classifiedCount = batch.periodId
    ? Array.from(identityMap.values()).filter((i) => i.classification !== null).length
    : records.filter((r) => r.classification !== null).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/batches/${batchId}`} className="text-sm text-blue-600 hover:underline">
          ← {batch.carrierName} · {batch.sourceFile}
        </Link>
        <h1 className="text-2xl font-bold text-[#1B2A4A] mt-1">{facility.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {classifiedCount} / {batch.periodId ? identityMap.size : records.length} employees classified
          {outreach && <span className="ml-3">· Status: <span className="font-medium">{outreach.status}</span></span>}
        </p>
        {outreach?.incompleteReason && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 inline-block">
            Incomplete reason: {outreach.incompleteReason}
          </div>
        )}
      </div>

      {showRemoved && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          <span>Showing removed employees only</span>
          <Link href={`/batches/${batchId}/facilities/${facilityId}`} className="ml-2 underline text-red-600 hover:text-red-800">View all</Link>
        </div>
      )}

      {outreach && (
        <FacilityActions
          outreachId={outreach.id}
          batchId={batchId}
          currentStatus={outreach.status ?? "DRAFT"}
          classifiedCount={classifiedCount}
          totalCount={batch.periodId ? identityMap.size : records.length}
        />
      )}

      {batch.periodId ? (
        // Period-aware view: show identities
        <div className="space-y-3">
          {identityMap.size === 0 ? (
            <Card><CardContent className="pt-6 text-center text-gray-400">No employee identities in this facility for this period.</CardContent></Card>
          ) : (
            Array.from(identityMap.values())
              .filter((i) => !showRemoved || (i.classification !== null && i.classification !== "STILL_EMPLOYED"))
              .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
              .map((identity) => (
                <Card key={identity.id} className={identity.classification && identity.classification !== "STILL_EMPLOYED" ? "border-l-4 border-l-green-400" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">
                          <EditIdentityName identityId={identity.id} currentName={identity.canonicalName} />
                        </div>
                        {identity.policyNumber && (
                          <div className="text-xs text-gray-400 mt-0.5">ID: {identity.policyNumber}</div>
                        )}
                        {identity.coverageTypes && identity.coverageTypes.length > 0 && (
                          <div className="text-xs text-blue-500 mt-0.5">{identity.coverageTypes.join(" · ")}</div>
                        )}
                        {identity.classification && (
                          <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${classificationColors[identity.classification]}`}>
                            {classificationLabels[identity.classification]}
                            {identity.effectiveDate && ` · ${new Date(identity.effectiveDate).toLocaleDateString()}`}
                          </span>
                        )}
                        {identity.classificationNotes && (
                          <div className="text-xs text-gray-500 mt-1 italic">{identity.classificationNotes}</div>
                        )}
                      </div>
                      <ClassifyRow
                        recordId={identity.id}
                        currentClassification={identity.classification}
                        currentNotes={identity.classificationNotes ?? ""}
                        currentEffectiveDate={
                          identity.effectiveDate
                            ? new Date(identity.effectiveDate).toISOString().split("T")[0]
                            : ""
                        }
                        identityId={identity.id}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      ) : (
        // Non-period view: existing behavior
        <div className="space-y-3">
          {records.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-gray-400">No employees in this facility.</CardContent></Card>
          ) : (
            records
              .filter((r) => !showRemoved || (r.classification !== null && r.classification !== "STILL_EMPLOYED"))
              .map((record) => (
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
      )}
    </div>
  );
}
