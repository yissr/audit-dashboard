export const dynamic = "force-dynamic";
import { listCarriers } from "@/app/carriers/actions";
import { listFacilities } from "@/app/facilities/actions";
import { db } from "@/db";
import { carrierReps, auditPeriods } from "@/db/schema";
import { NewBatchForm } from "./new-batch-form";

export default async function NewBatchPage() {
  const carrierList = await listCarriers();
  const existingFacilities = await listFacilities();
  const reps = await db.select().from(carrierReps).orderBy(carrierReps.carrierId);
  const periods = await db.select().from(auditPeriods).orderBy(auditPeriods.createdAt);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Upload Carrier File</h1>
      <NewBatchForm
        carriers={carrierList}
        existingFacilities={existingFacilities.map((f) => ({ id: f.id, name: f.name }))}
        allReps={reps.map((r) => ({ id: r.id, carrierId: r.carrierId, name: r.name }))}
        periods={periods.map((p) => ({ id: p.id, name: p.name, startDate: p.startDate }))}
      />
    </div>
  );
}
