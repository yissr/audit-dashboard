"use client";

import { useState } from "react";

type Facility = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactName: string | null;
};

export default function FacilitySearch({ facilities }: { facilities: Facility[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? facilities.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    : facilities;

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search facilities..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30"
      />
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">No facilities match your search.</td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">
                    <span>{f.name}</span>
                    {!f.contactEmail && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
                        No email
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{f.contactEmail ?? "—"}</td>
                  <td className="py-3 px-4 text-gray-500">{f.contactName ?? "—"}</td>
                  <td className="py-3 px-4">
                    <a href={`/facilities/${f.id}/edit`} className="text-blue-600 hover:underline text-xs">Edit</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
