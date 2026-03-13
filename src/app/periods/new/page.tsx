import NewPeriodForm from "./NewPeriodForm";
import Link from "next/link";

export default function NewPeriodPage() {
  return (
    <div className="max-w-md">
      <Link href="/periods" className="text-sm text-blue-600 hover:underline">← Periods</Link>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mt-1 mb-6">New Audit Period</h1>
      <NewPeriodForm />
    </div>
  );
}
