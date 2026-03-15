export const dynamic = "force-dynamic";

import { db } from "@/db";
import { carriers, carrierReps, auditPeriods, auditBatches } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { listFacilities } from "@/app/facilities/actions";
import FacilitySearch from "@/app/facilities/FacilitySearch";
import ConfigTabs from "./ConfigTabs";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ConfigurationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "facilities" } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B2A4A]">Configuration</h1>
      <ConfigTabs activeTab={tab} />
      {tab === "facilities" && <FacilitiesTab />}
      {tab === "carriers" && <CarriersTab />}
      {tab === "periods" && <PeriodsTab />}
    </div>
  );
}

async function FacilitiesTab() {
  const rawList = await listFacilities();
  const facilityList = rawList.map((f) => ({
    id: f.id,
    name: f.name,
    contactEmail: f.contactEmail ?? null,
    contactName: f.contactName ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{facilityList.length} total</p>
        <Link href="/facilities/new" className="text-sm text-blue-600 hover:underline">+ Add Facility</Link>
      </div>
      {facilityList.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">No facilities yet.</CardContent></Card>
      ) : (
        <FacilitySearch facilities={facilityList} />
      )}
    </div>
  );
}

async function CarriersTab() {
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
    <div className="space-y-4">
      <div className="flex justify-end">
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

async function PeriodsTab() {
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

  const periodNameById = new Map(periodsWithCount.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
