export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditPeriods, auditBatches } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default async function PeriodsPage() {
  // Fetch all periods with batch count
  const periodsWithCount = await db
    .select({
      id: auditPeriods.id,
      name: auditPeriods.name,
      startDate: auditPeriods.startDate,
      endDate: auditPeriods.endDate,
      linkedPeriodId: auditPeriods.linkedPeriodId,
      batchCount: sql<number>`count(${auditBatches.id})::int`,
    })
    .from(auditPeriods)
    .leftJoin(auditBatches, eq(auditBatches.periodId, auditPeriods.id))
    .groupBy(auditPeriods.id)
    .orderBy(auditPeriods.createdAt);

  // Build a map of id → name for linked period display
  const periodNameById = new Map(periodsWithCount.map((p) => [p.id, p.name]));

  function formatDate(d: Date | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Audit Periods</h1>
        <Link href="/periods/new" className="text-sm text-blue-600 hover:underline">+ New Period</Link>
      </div>
      {periodsWithCount.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">No periods yet.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-medium">Period</th>
                <th className="text-left py-3 px-4 font-medium">Dates</th>
                <th className="text-left py-3 px-4 font-medium">Linked Period</th>
                <th className="text-left py-3 px-4 font-medium w-20">Batches</th>
              </tr>
            </thead>
            <tbody>
              {periodsWithCount.map((p) => {
                const linkedName = p.linkedPeriodId ? periodNameById.get(p.linkedPeriodId) : null;
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDate(p.startDate)} → {formatDate(p.endDate)}
                    </td>
                    <td className="py-3 px-4">
                      {linkedName ? (
                        <span className="text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded font-medium">
                          ↔ {linkedName}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{p.batchCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
