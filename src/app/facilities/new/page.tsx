"use client";
import { useRouter } from "next/navigation";
import { createFacility } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewFacilityPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await createFacility(formData);
    router.push("/facilities");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Add Facility</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Facility Name *</Label>
              <Input id="name" name="name" placeholder="e.g. Acme Corp" required />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" placeholder="contact@facility.com" />
            </div>
            <div>
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" name="contactName" placeholder="Jane Smith" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Internal notes..." />
            </div>
            <Button type="submit" className="w-full">Create Facility</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
