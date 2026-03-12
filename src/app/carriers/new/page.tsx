"use client";
import { useRouter } from "next/navigation";
import { createCarrier } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function NewCarrierPage() {
  const router = useRouter();
  const [parserType, setParserType] = useState("standard");

  async function handleSubmit(formData: FormData) {
    await createCarrier(formData);
    router.push("/carriers");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Add Carrier</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Carrier Name *</Label>
              <Input id="name" name="name" placeholder="e.g. Hartford" required />
            </div>
            <div>
              <Label htmlFor="emailPattern">Email Pattern</Label>
              <Input id="emailPattern" name="emailPattern" placeholder="e.g. @hartford.com" />
            </div>
            <div>
              <Label htmlFor="fileType">File Type</Label>
              <select name="fileType" id="fileType" className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="CSV">CSV</option>
                <option value="XLSX">XLSX</option>
                <option value="PDF">PDF</option>
              </select>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold">File Format / Parser</Label>
              <select
                name="parserType"
                className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={parserType}
                onChange={(e) => setParserType(e.target.value)}
              >
                <option value="standard">Standard (has facilityName column)</option>
                <option value="mo-census">Mo Census (section-header format)</option>
                <option value="group-by-field">Group by Field (Avid / Momentous style)</option>
              </select>
            </div>

            {parserType === "group-by-field" && (
              <div className="space-y-3 bg-gray-50 rounded-md p-4 text-sm">
                <p className="text-gray-500 text-xs">Configure which columns to read from the file.</p>
                <div>
                  <Label htmlFor="facilityField">Facility Column *</Label>
                  <Input id="facilityField" name="facilityField" placeholder="e.g. Division or GroupLocationNumber" />
                </div>
                <div>
                  <Label htmlFor="facilityPrefix">Facility Name Prefix</Label>
                  <Input id="facilityPrefix" name="facilityPrefix" placeholder='e.g. "Division " or "Location "' />
                </div>
                <div>
                  <Label htmlFor="firstNameField">First Name Column *</Label>
                  <Input id="firstNameField" name="firstNameField" placeholder="e.g. First Name or MemberFirstName" />
                </div>
                <div>
                  <Label htmlFor="lastNameField">Last Name Column (if separate)</Label>
                  <Input id="lastNameField" name="lastNameField" placeholder="e.g. Last Name or MemberLastName" />
                </div>
                <div>
                  <Label htmlFor="memberIdField">Member ID Column</Label>
                  <Input id="memberIdField" name="memberIdField" placeholder="e.g. Member ID or SubscriberNumber" />
                </div>
                <div>
                  <Label htmlFor="ssnField">SSN Column (optional)</Label>
                  <Input id="ssnField" name="ssnField" placeholder="e.g. SocialSecurityNumber" />
                </div>
              </div>
            )}

            {parserType === "mo-census" && (
              <div className="bg-blue-50 rounded-md p-3 text-sm text-blue-700">
                Mo Census format — no additional configuration needed. Facility names are read automatically from section headers in the file.
              </div>
            )}

            <Button type="submit" className="w-full">Create Carrier</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
