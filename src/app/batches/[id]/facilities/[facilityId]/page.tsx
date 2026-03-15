export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditBatches, auditRecords, auditPeriods, carriers, facilities, facilityOutreaches, employeeIdentities, outreachEvents } from "@/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import ClassifyRow from "./ClassifyRow";
import FacilityActions from "./FacilityActions";
import EditIdentityName from "./EditIdentityName";
import EmailPanel from "./EmailPanel";

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
  const showUnclassified = show === "unclassified";

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

  // Load comms events
  const commsEvents = outreach
    ? await db
        .select()
        .from(outreachEvents)
        .where(eq(outreachEvents.outreachId, outreach.id))
        .orderBy(asc(outreachEvents.createdAt))
    : [];

  // Synthetic REPLIED event from outreach fields if no REPLIED event logged
  const hasRepliedEvent = commsEvents.some((e) => e.eventType === "REPLIED");
  const syntheticEvents: Array<{
    id: string;
    eventType: string;
    note: string | null;
    emailSent: boolean | null;
    createdAt: Date | null;
  }> = [];
  if (!hasRepliedEvent && outreach?.repliedAt) {
    syntheticEvents.push({
      id: "synthetic-replied",
      eventType: "REPLIED",
      note: outreach.replyRaw ?? null,
      emailSent: false,
      createdAt: outreach.repliedAt,
    });
  }

  const allCommsEvents = [
    ...commsEvents,
    ...syntheticEvents,
  ].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });

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

  const totalCount = batch.periodId ? identityMap.size : records.length;

  const emailHtml = outreach?.emailBodyHtml ?? null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 flex items-center gap-1 flex-wrap">
        <Link href="/" className="hover:underline text-blue-600">Dashboard</Link>
        <span>→</span>
        <Link href={`/batches/${batchId}`} className="hover:underline text-blue-600">{batch.carrierName}</Link>
        <span>→</span>
        <span className="text-gray-700 font-medium">{facility.name}</span>
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 bg-white z-10 border-b pb-4 -mx-4 px-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A4A]">{facility.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {classifiedCount} / {totalCount} employees classified
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
              totalCount={totalCount}
            />
          )}
        </div>
      </div>

      {/* Communications timeline */}
      {allCommsEvents.length > 0 && (
        <details className="border border-gray-200 rounded-md">
          <summary className="px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer select-none hover:bg-gray-50">
            Communications ({allCommsEvents.length} event{allCommsEvents.length !== 1 ? "s" : ""})
          </summary>
          <div className="px-4 pb-4 pt-2">
            <div className="relative pl-5">
              {/* Vertical line */}
              <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {allCommsEvents.map((evt) => {
                  const dotColor =
                    evt.eventType === "SENT" || evt.eventType === "DONE"
                      ? "bg-green-500"
                      : evt.eventType === "REMINDER"
                      ? "bg-blue-500"
                      : evt.eventType === "INCOMPLETE_NOTICE"
                      ? "bg-red-500"
                      : evt.eventType === "REPLIED"
                      ? "bg-purple-500"
                      : "bg-gray-400";

                  const label =
                    evt.eventType === "SENT" ? "Email Sent"
                    : evt.eventType === "REMINDER" ? "Reminder Sent"
                    : evt.eventType === "REPLIED" ? "Reply Received"
                    : evt.eventType === "INCOMPLETE_NOTICE" ? "Marked Incomplete"
                    : evt.eventType === "DONE" ? "Marked Done"
                    : "Note";

                  return (
                    <div key={evt.id} className="relative flex items-start gap-3">
                      <span className={`absolute -left-3.5 mt-1 w-3 h-3 rounded-full border-2 border-white ${dotColor}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{label}</span>
                          {evt.emailSent && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-600 rounded">
                              email sent
                            </span>
                          )}
                          {evt.createdAt && (
                            <span className="text-xs text-gray-400">
                              {new Date(evt.createdAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {evt.note && (
                          <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{evt.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </details>
      )}

      {/* Split layout: email panel + employee list — independent scroll */}
      <div className="flex gap-4 items-start" style={{ height: "calc(100vh - 180px)" }}>
        {emailHtml && <EmailPanel htmlBody={emailHtml} />}
        <div className="flex-1 min-w-0 overflow-y-auto h-full pr-1 space-y-3">
        {/* Filter bar */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/batches/${batchId}/facilities/${facilityId}`}
            className={`px-3 py-1.5 rounded-md transition-colors ${!show ? "bg-[#1B2A4A] text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}
          >
            All
          </Link>
          <Link
            href={`/batches/${batchId}/facilities/${facilityId}?show=unclassified`}
            className={`px-3 py-1.5 rounded-md transition-colors ${show === "unclassified" ? "bg-[#1B2A4A] text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Unclassified
          </Link>
          <Link
            href={`/batches/${batchId}/facilities/${facilityId}?show=removed`}
            className={`px-3 py-1.5 rounded-md transition-colors ${show === "removed" ? "bg-[#1B2A4A] text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Removed
          </Link>
        </div>

      {batch.periodId ? (
        // Period-aware view: show identities
        <div className="space-y-3">
          {identityMap.size === 0 ? (
            <Card><CardContent className="pt-6 text-center text-gray-400">No employee identities in this facility for this period.</CardContent></Card>
          ) : (
            Array.from(identityMap.values())
              .filter((i) => {
                if (showRemoved) return i.classification !== null && i.classification !== "STILL_EMPLOYED";
                if (showUnclassified) return i.classification === null;
                return true;
              })
              .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
              .map((identity) => (
                <Card key={identity.id} className={identity.classification !== null ? "border-l-4 border-l-green-400" : ""}>
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
              .filter((r) => {
                if (showRemoved) return r.classification !== null && r.classification !== "STILL_EMPLOYED";
                if (showUnclassified) return r.classification === null;
                return true;
              })
              .map((record) => (
              <Card key={record.id} className={record.classification !== null ? "border-l-4 border-l-green-400" : ""}>
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
        </div>
      </div>
  );
}
