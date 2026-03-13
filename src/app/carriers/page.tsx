export const dynamic = "force-dynamic";

import { listCarriers } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function CarriersPage() {
  const carrierList = await listCarriers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Carriers</h1>
        <Link href="/carriers/new" className="text-sm text-blue-600 hover:underline">+ Add Carrier</Link>
      </div>
      {carrierList.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">No carriers yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {carrierList.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  {c.logoUrl && (
                    <img src={c.logoUrl} alt={`${c.name} logo`} className="h-8 w-auto object-contain rounded" />
                  )}
                  <CardTitle className="text-base"><Link href={`/carriers/${c.id}`} className="hover:underline text-[#1B2A4A]">{c.name}</Link></CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">{c.emailPattern ?? "No email pattern set"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
