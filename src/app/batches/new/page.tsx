export const dynamic = "force-dynamic";

import { listCarriers } from "@/app/carriers/actions";
import { listFacilities } from "@/app/facilities/actions";
import { NewBatchForm } from "./new-batch-form";

export default async function NewBatchPage() {
  const carrierList = await listCarriers();
  const existingFacilities = await listFacilities();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Upload Carrier File</h1>
      <NewBatchForm
        carriers={carrierList}
        existingFacilities={existingFacilities.map((f) => ({ id: f.id, name: f.name }))}
      />
    </div>
  );
}
