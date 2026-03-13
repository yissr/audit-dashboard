import { createPeriod } from "../actions";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData) {
  "use server";
  await createPeriod(formData);
  redirect("/periods");
}

export default function NewPeriodPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">New Audit Period</h1>
      <form action={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Period Name *</label>
          <input name="name" required placeholder="e.g. Q1 2026" className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input name="startDate" type="date" className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input name="endDate" type="date" className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="w-full bg-[#1B2A4A] text-white py-2 rounded text-sm font-medium">Create Period</button>
      </form>
    </div>
  );
}
