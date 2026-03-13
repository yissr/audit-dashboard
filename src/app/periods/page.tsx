export const dynamic = "force-dynamic";
import { listPeriods } from "./actions";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default async function PeriodsPage() {
  const periods = await listPeriods();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Audit Periods</h1>
        <Link href="/periods/new" className="text-sm text-blue-600 hover:underline">+ New Period</Link>
      </div>
      {periods.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-gray-400">No periods yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {periods.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 pb-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"}
                  {" → "}
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
