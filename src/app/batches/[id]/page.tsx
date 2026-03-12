export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditBatches, auditRecords, carriers, facilities, facilityOutreaches } from "@/db/schema";
import { eq, count, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import OutreachStatusSelect from "./OutreachStatusSelect";
import FacilityRowActions from "./FacilityRowActions";
import { checkAndWakeExpiredSnoozes } from "../actions";
import Link from "next/link";

const statusColors: Record<string, string> = {
  PENDING_OUTREACH: "bg-gray-100 text-gray-700",
  AWAITING_REPLY: "bg-yellow-100 text-yellow-700",
  REPLIED: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-orange-100 text-orange-700",
  INCOMPLETE: "bg-red-100 text-red-700",
  SNOOZED: "bg-purple-100 text-purple-700",
  DONE: "bg-green-100 text-green-700",
};

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [batch] = await db
    .select({
      id: auditBatches.id,
      status: auditBatches.status,
      sourceFile: auditBatches.sourceFile,
      receivedAt: auditBatches.receivedAt,
      carrierName: carriers.name,
    })
    .from(auditBatches)
    .leftJoin(carriers, eq(auditBatches.carrierId, carriers.id))
    .where(eq(auditBatches.id, id));

  if (!batch) notFound();

  // Wake any expired snoozes before rendering
  await checkAndWakeExpiredSnoozes(id);

  const facilityGroups = await db
    .select({
      facilityId: auditRecords.facilityId,
      facilityName: facilities.name,
      recordCount: count(auditRecords.id),
      outreachId: facilityOutreaches.id,
      outreachStatus: facilityOutreaches.status,
      snoozeUntil: facilityOutreaches.snoozeUntil,
      reminderCount: facilityOutreaches.reminderCount,
      lastReminderAt: facilityOutreaches.lastReminderAt,
    })
    .from(auditRecords)
    .leftJoin(facilities, eq(auditRecords.facilityId, facilities.id))
    .leftJoin(
      facilityOutreaches,
      and(
        eq(facilityOutreaches.batchId, id),
        eq(facilityOutreaches.facilityId, auditRecords.facilityId)
      )
    )
    .where(eq(auditRecords.batchId, id))
    .groupBy(
      auditRecords.facilityId,
      facilities.name,
      facilityOutreaches.id,
      facilityOutreaches.status,
      facilityOutreaches.snoozeUntil,
      facilityOutreaches.reminderCount,
      facilityOutreaches.lastReminderAt
    );

  const totalFacilities = facilityGroups.length;
  const doneCount = facilityGroups.filter((fg) => fg.outreachStatus === "DONE").length;
  const donePercent = totalFacilities > 0 ? Math.round((doneCount / totalFacilities) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Batch Detail</h1>
        <p className="text-sm text-gray-500 mt-1">
          {batch.carrierName} · {batch.sourceFile} · {batch.receivedAt ? new Date(batch.receivedAt).toLocaleDateString() : ""}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Facilities Progress</span>
            <span className="text-sm text-gray-500">{doneCount} / {totalFacilities} Done</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${donePercent}%` }} />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Facilities ({totalFacilities})</h2>
        {facilityGroups.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-gray-400">No facilities in this batch.</CardContent></Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium">Facility</th>
                  <th className="text-left py-3 px-4 font-medium">Employees</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilityGroups.map((fg) => {
                  const displayStatus = fg.outreachStatus ?? "PENDING_OUTREACH";
                  return (
                    <tr key={fg.facilityId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        <Link href={`/batches/${id}/facilities/${fg.facilityId}`} className="text-blue-600 hover:underline">
                          {fg.facilityName ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{fg.recordCount}</td>
                      <td className="py-3 px-4">
                        {fg.outreachId ? (
                          <OutreachStatusSelect
                            outreachId={fg.outreachId}
                            currentStatus={displayStatus}
                          />
                        ) : (
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[displayStatus]}`}>
                            {displayStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <Link href={`/batches/${id}/facilities/${fg.facilityId}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">Classify</Link>
                          {fg.outreachId && (
                            <FacilityRowActions
                              outreachId={fg.outreachId}
                              status={displayStatus}
                              snoozeUntil={fg.snoozeUntil ? fg.snoozeUntil.toISOString() : null}
                              reminderCount={fg.reminderCount ?? 0}
                              lastReminderAt={fg.lastReminderAt ? fg.lastReminderAt.toISOString() : null}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
