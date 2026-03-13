export const dynamic = "force-dynamic";
import { db } from "@/db";
import { carriers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { listReps, addRep, deleteRep } from "./reps/actions";
import Link from "next/link";
import CarrierLogoUpload from "./CarrierLogoUpload";
import DeleteCarrierButton from "./DeleteCarrierButton";

export default async function CarrierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, id));
  if (!carrier) notFound();

  const reps = await listReps(id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/carriers" className="text-sm text-blue-600 hover:underline">← Carriers</Link>
          <h1 className="text-2xl font-bold text-[#1B2A4A] mt-1">{carrier.name}</h1>
        </div>
        <DeleteCarrierButton carrierId={id} carrierName={carrier.name} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Logo</h2>
        <CarrierLogoUpload carrierId={id} currentLogoUrl={carrier.logoUrl} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Carrier Reps</h2>
        {reps.length === 0 ? (
          <p className="text-sm text-gray-400">No reps yet.</p>
        ) : (
          <table className="w-full text-sm border rounded-md overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Phone</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <tr key={rep.id} className="border-t">
                  <td className="px-3 py-2">{rep.name}</td>
                  <td className="px-3 py-2 text-gray-500">{rep.email ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{rep.phone ?? "—"}</td>
                  <td className="px-3 py-2">
                    <form action={async () => { "use server"; await deleteRep(rep.id, id); }}>
                      <button type="submit" className="text-xs text-red-500 hover:underline">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={addRep} className="mt-4 flex gap-2 flex-wrap">
          <input type="hidden" name="carrierId" value={id} />
          <input name="name" placeholder="Name *" required className="border rounded px-3 py-1.5 text-sm" />
          <input name="email" placeholder="Email" type="email" className="border rounded px-3 py-1.5 text-sm" />
          <input name="phone" placeholder="Phone" className="border rounded px-3 py-1.5 text-sm" />
          <button type="submit" className="bg-[#1B2A4A] text-white px-3 py-1.5 rounded text-sm">Add Rep</button>
        </form>
      </div>
    </div>
  );
}
