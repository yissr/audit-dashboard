"use client";

import Link from "next/link";

const tabs = [
  { id: "facilities", label: "Facilities" },
  { id: "carriers", label: "Carriers" },
  { id: "periods", label: "Periods" },
];

export default function ConfigTabs({ activeTab }: { activeTab: string }) {
  return (
    <div className="flex border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/configuration?tab=${tab.id}`}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab.id
              ? "border-[#1B2A4A] text-[#1B2A4A]"
              : "border-transparent text-gray-500 hover:text-[#1B2A4A] hover:border-gray-300"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
