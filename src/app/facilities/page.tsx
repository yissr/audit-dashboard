export const dynamic = "force-dynamic";

import { listFacilities } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function FacilitiesPage() {
  const facilityList = await listFacilities();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Facilities</h1>
        <Link href="/facilities/new" className="text-sm text-blue-600 hover:underline">+ Add Facility</Link>
      </div>
      {facilityList.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">No facilities yet.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Contact Email</th>
                <th className="text-left py-3 px-4 font-medium">Contact Name</th>
                <th className="text-left py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {facilityList.map((f) => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{f.name}</td>
                  <td className="py-3 px-4 text-gray-500">{f.contactEmail ?? "—"}</td>
                  <td className="py-3 px-4 text-gray-500">{f.contactName ?? "—"}</td>
                  <td className="py-3 px-4">
                    <Link href={`/facilities/${f.id}/edit`} className="text-blue-600 hover:underline text-xs">Edit</Link>
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
