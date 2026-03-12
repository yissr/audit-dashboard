export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditBatches, carriers, facilityOutreaches } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function DashboardPage() {
  const batches = await db
    .select({
      id: auditBatches.id,
      status: auditBatches.status,
      sourceFile: auditBatches.sourceFile,
      receivedAt: auditBatches.receivedAt,
      carrierName: carriers.name,
    })
    .from(auditBatches)
    .leftJoin(carriers, eq(auditBatches.carrierId, carriers.id))
    .orderBy(auditBatches.receivedAt);

  const awaitingReply = await db
    .select({ count: count() })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.status, "AWAITING_REPLY"));
  const incomplete = await db
    .select({ count: count() })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.status, "INCOMPLETE"));
  const snoozed = await db
    .select({ count: count() })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.status, "SNOOZED"));
  const done = await db
    .select({ count: count() })
    .from(facilityOutreaches)
    .where(eq(facilityOutreaches.status, "DONE"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Workers&apos; Compensation Audit Overview</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{awaitingReply[0]?.count ?? 0}</div>
            <div className="text-sm text-gray-500">Awaiting Reply</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{incomplete[0]?.count ?? 0}</div>
            <div className="text-sm text-gray-500">Incomplete</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{snoozed[0]?.count ?? 0}</div>
            <div className="text-sm text-gray-500">Snoozed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{done[0]?.count ?? 0}</div>
            <div className="text-sm text-gray-500">Done</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Active Batches</h2>
          <Link href="/batches/new" className="text-sm text-blue-600 hover:underline">+ New Batch</Link>
        </div>
        {batches.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-400">
              No batches yet. <Link href="/batches/new" className="text-blue-600 hover:underline">Upload a carrier file</Link> to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {batches.map((b) => (
              <Link key={b.id} href={`/batches/${b.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{b.carrierName ?? "Unknown Carrier"}</CardTitle>
                      <Badge variant={b.status === "SUBMITTED" ? "default" : "secondary"}>{b.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      File: {b.sourceFile} · Received: {b.receivedAt ? new Date(b.receivedAt).toLocaleDateString() : "N/A"}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
