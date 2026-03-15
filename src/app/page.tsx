export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditBatches, auditPeriods, auditRecords, carriers, facilityOutreaches, facilities } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function DashboardPage() {
  // 1. Fetch all audit periods
  const allPeriods = await db.select().from(auditPeriods);

  // 2. Separate monthly vs quarterly
  const monthlyPeriods = allPeriods.filter((p) => !/^Q\d/.test(p.name));
  const quarterlyPeriods = allPeriods.filter((p) => /^Q\d/.test(p.name));
  const quarterlyById = new Map(quarterlyPeriods.map((p) => [p.id, p]));

  // 3. Collect all period IDs to fetch batches for
  const allPeriodIds = allPeriods.map((p) => p.id);

  // 4. Fetch ALL batches (period-linked and non-period) with carrier info
  const batchRows = await db
    .select({
      id: auditBatches.id,
      periodId: auditBatches.periodId,
      carrierId: auditBatches.carrierId,
      status: auditBatches.status,
      sourceFile: auditBatches.sourceFile,
      receivedAt: auditBatches.receivedAt,
      carrierName: carriers.name,
      carrierLogoUrl: carriers.logoUrl,
    })
    .from(auditBatches)
    .leftJoin(carriers, eq(auditBatches.carrierId, carriers.id));

  // 5. Count audit records per batch
  const recordCountRows =
    batchRows.length > 0
      ? await db
          .select({
            batchId: auditRecords.batchId,
            count: sql<number>`count(*)::int`,
          })
          .from(auditRecords)
          .groupBy(auditRecords.batchId)
      : [];
  const recordCountMap = new Map(recordCountRows.map((r) => [r.batchId, r.count]));

  // 5b. Count DONE outreaches per batch + total outreach count per batch
  const outreachCountRows =
    batchRows.length > 0
      ? await db
          .select({
            batchId: facilityOutreaches.batchId,
            doneCount: sql<number>`count(*) filter (where ${facilityOutreaches.status} = 'DONE')::int`,
            totalCount: sql<number>`count(*)::int`,
          })
          .from(facilityOutreaches)
          .groupBy(facilityOutreaches.batchId)
      : [];
  const doneOutreachMap = new Map(outreachCountRows.map((r) => [r.batchId, r.doneCount]));
  const totalOutreachMap = new Map(outreachCountRows.map((r) => [r.batchId, r.totalCount]));

  // 6. Group batches by periodId
  const batchesByPeriod = new Map<string, typeof batchRows>();
  for (const batch of batchRows) {
    if (!batch.periodId) continue;
    if (!batchesByPeriod.has(batch.periodId)) batchesByPeriod.set(batch.periodId, []);
    batchesByPeriod.get(batch.periodId)!.push(batch);
  }

  // Summary stats — all active (non-submitted) batches visible on dashboard
  const activeBatchIds = batchRows.map((b) => b.id);

  const outreachStats = activeBatchIds.length > 0
    ? await db
        .select({
          status: facilityOutreaches.status,
          count: sql<number>`count(*)::int`,
        })
        .from(facilityOutreaches)
        .where(inArray(facilityOutreaches.batchId, activeBatchIds))
        .groupBy(facilityOutreaches.status)
    : [];

  let statReplied = 0;
  let statIncomplete = 0;
  let statDone = 0;
  let statTotal = 0;

  for (const row of outreachStats) {
    statTotal += row.count;
    if (row.status === "REPLIED" || row.status === "DONE") statReplied += row.count;
    if (row.status === "INCOMPLETE") statIncomplete += row.count;
    if (row.status === "DONE") statDone += row.count;
  }

  const statDonePct = statTotal > 0 ? Math.round((statDone / statTotal) * 100) : 0;

  // 7. Build month sections
  type MonthSection = {
    monthPeriodName: string;
    startDate: Date | null;
    batches: Array<{
      id: string;
      carrierName: string | null;
      carrierLogoUrl: string | null;
      status: string | null;
      recordCount: number;
      quarterlyLabel: string | null;
      facilitiesDone: number;
      facilitiesTotal: number;
    }>;
  };

  const sections: MonthSection[] = [];

  for (const monthly of monthlyPeriods) {
    const monthlyBatches = batchesByPeriod.get(monthly.id) ?? [];

    // Also collect quarterly batches for overlap months
    let quarterlyLabel: string | null = null;
    let quarterlyBatches: typeof batchRows = [];
    if (monthly.linkedPeriodId && quarterlyById.has(monthly.linkedPeriodId)) {
      const qPeriod = quarterlyById.get(monthly.linkedPeriodId)!;
      quarterlyLabel = qPeriod.name;
      quarterlyBatches = batchesByPeriod.get(monthly.linkedPeriodId) ?? [];
    }

    const allBatchesForMonth = [
      ...monthlyBatches.map((b) => ({ ...b, quarterlyLabel: null })),
      ...quarterlyBatches.map((b) => ({ ...b, quarterlyLabel })),
    ];

    if (allBatchesForMonth.length === 0) continue;

    sections.push({
      monthPeriodName: monthly.name,
      startDate: monthly.startDate ?? null,
      batches: allBatchesForMonth.map((b) => ({
        id: b.id,
        carrierName: b.carrierName ?? null,
        carrierLogoUrl: b.carrierLogoUrl ?? null,
        status: b.status ?? null,
        recordCount: recordCountMap.get(b.id) ?? 0,
        quarterlyLabel: b.quarterlyLabel,
        facilitiesDone: doneOutreachMap.get(b.id) ?? 0,
        facilitiesTotal: totalOutreachMap.get(b.id) ?? 0,
      })),
    });
  }

  // 8. Sort sections by date descending (nulls last)
  sections.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return b.startDate.getTime() - a.startDate.getTime();
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Workers&apos; Compensation Audit — Month by Month</p>
        </div>
        <Link
          href="/batches/new"
          className="inline-flex items-center gap-1 text-sm bg-[#1B2A4A] text-white px-4 py-2 rounded-md hover:bg-[#253a63] transition-colors"
        >
          + Upload Batch
        </Link>
      </div>

      {/* Summary stats — current month */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Facilities Replied</p>
          <p className="text-2xl font-bold text-[#1B2A4A] mt-1">{statReplied}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Incomplete</p>
          <p className="text-2xl font-bold text-[#1B2A4A] mt-1">{statIncomplete}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Facilities Done</p>
          <p className="text-2xl font-bold text-[#1B2A4A] mt-1">
            {statDone} / {statTotal} ({statDonePct}%)
          </p>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No batches yet. <Link href="/batches/new" className="text-blue-600 hover:underline">Upload your first batch.</Link>
        </div>
      ) : (
        sections.map((section) => {
          const allSubmitted = section.batches.every((b) => b.status === "SUBMITTED");
          const anySubmitted = section.batches.some((b) => b.status === "SUBMITTED");
          const borderColor = allSubmitted
            ? "border-l-4 border-l-green-400"
            : anySubmitted
            ? "border-l-4 border-l-yellow-400"
            : "border-l-4 border-l-gray-200";

          return (
            <section key={section.monthPeriodName}>
              <h2 className="text-lg font-semibold text-[#1B2A4A] mb-3">{section.monthPeriodName}</h2>
              <div className={`border rounded-md overflow-hidden ${borderColor}`}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Carrier</th>
                      <th className="text-right px-4 py-2 font-medium w-28">Records</th>
                      <th className="text-left px-4 py-2 font-medium w-48">Progress</th>
                      <th className="text-left px-4 py-2 font-medium w-32">Status</th>
                      <th className="text-left px-4 py-2 font-medium w-32">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.batches.map((batch) => {
                      const progressPct = batch.facilitiesTotal > 0
                        ? Math.round((batch.facilitiesDone / batch.facilitiesTotal) * 100)
                        : 0;
                      return (
                        <tr
                          key={batch.id}
                          className="border-t hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={undefined}
                        >
                          <td className="px-4 py-3">
                            <Link href={`/batches/${batch.id}`} className="flex items-center gap-2 hover:underline">
                              {batch.carrierLogoUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={batch.carrierLogoUrl}
                                  alt={batch.carrierName ?? "Carrier"}
                                  className="h-6 w-6 object-contain rounded"
                                />
                              )}
                              <span>{batch.carrierName ?? "Unknown Carrier"}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600">{batch.recordCount}</td>
                          <td className="px-4 py-3">
                            {batch.facilitiesTotal > 0 ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-green-500 h-1.5 rounded-full"
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                                    {batch.facilitiesDone}/{batch.facilitiesTotal}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                batch.status === "SUBMITTED"
                                  ? "default"
                                  : batch.status === "CLOSED"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {batch.status ?? "DRAFT"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {batch.quarterlyLabel ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                                {batch.quarterlyLabel}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
