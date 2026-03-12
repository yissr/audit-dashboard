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

  // Group by "Month YYYY", newest first
  const grouped = new Map<string, typeof batches>();
  for (const b of batches) {
    const label = b.receivedAt
      ? new Date(b.receivedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Unknown Date";
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label)!.push(b);
  }
  const sortedMonths = [...grouped.entries()].sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Audit Batches</h1>
        <Link href="/batches/new" className="text-sm text-blue-600 hover:underline">+ New Batch</Link>
      </div>
      {batches.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">No batches yet. <Link href="/batches/new" className="text-blue-600 hover:underline">Upload a carrier file.</Link></CardContent></Card>
      ) : (
        <div className="space-y-8">
          {sortedMonths.map(([month, monthBatches]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{month}</h2>
              <div className="overflow-x-auto rounded-md border">
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
                    {monthBatches.map((b) => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
