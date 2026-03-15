export const dynamic = "force-dynamic";

import { listFacilities } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import FacilitySearch from "./FacilitySearch";

export default async function FacilitiesPage() {
  const rawList = await listFacilities();
  const facilityList = rawList.map((f) => ({
    id: f.id,
    name: f.name,
    contactEmail: f.contactEmail ?? null,
    contactName: f.contactName ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Facilities</h1>
          <p className="text-sm text-gray-500 mt-0.5">{facilityList.length} total</p>
        </div>
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
