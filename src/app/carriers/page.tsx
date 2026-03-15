export const dynamic = "force-dynamic";

import { db } from "@/db";
import { carriers, carrierReps } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function CarriersPage() {
  const carrierList = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      logoUrl: carriers.logoUrl,
      emailPattern: carriers.emailPattern,
      repCount: sql<number>`count(${carrierReps.id})::int`,
    })
    .from(carriers)
    .leftJoin(carrierReps, eq(carrierReps.carrierId, carriers.id))
    .groupBy(carriers.id)
    .orderBy(carriers.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Carriers</h1>
        <Link href="/carriers/new" className="text-sm text-blue-600 hover:underline">+ Add Carrier</Link>
      </div>
      {carrierList.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">No carriers yet.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-medium">Carrier</th>
                <th className="text-left py-3 px-4 font-medium">Email Pattern</th>
                <th className="text-left py-3 px-4 font-medium w-24">Reps</th>
                <th className="text-left py-3 px-4 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {carrierList.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <Link href={`/carriers/${c.id}`} className="font-medium text-[#1B2A4A] hover:underline w-48 shrink-0">
                        {c.name}
                      </Link>
                      {c.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logoUrl} alt={`${c.name} logo`} className="h-8 w-auto object-contain" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">{c.emailPattern ?? "—"}</td>
                  <td className="py-3 px-4 text-gray-500">{c.repCount}</td>
                  <td className="py-3 px-4">
                    <Link href={`/carriers/${c.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
