export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditBatches, carriers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function BatchesPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Audit Batches</h1>
        <Link href="/batches/new" className="text-sm text-blue-600 hover:underline">+ New Batch</Link>
      </div>
      {batches.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">No batches yet. <Link href="/batches/new" className="text-blue-600 hover:underline">Upload a carrier file.</Link></CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-medium">Carrier</th>
                <th className="text-left py-3 px-4 font-medium">File</th>
                <th className="text-left py-3 px-4 font-medium">Received</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{b.carrierName ?? "—"}</td>
                  <td className="py-3 px-4 text-gray-500">{b.sourceFile}</td>
                  <td className="py-3 px-4 text-gray-500">{b.receivedAt ? new Date(b.receivedAt).toLocaleDateString() : "—"}</td>
                  <td className="py-3 px-4"><Badge variant="secondary">{b.status}</Badge></td>
                  <td className="py-3 px-4"><Link href={`/batches/${b.id}`} className="text-blue-600 hover:underline text-xs">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
