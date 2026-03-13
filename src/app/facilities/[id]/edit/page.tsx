export const dynamic = "force-dynamic";

import { db } from "@/db";
import { facilities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { updateFacility } from "../../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CcEmailsEditor from "./CcEmailsEditor";

export default async function EditFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
  if (!facility) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateFacility(id, formData);
    redirect("/facilities");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Edit Facility</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="name">Facility Name *</Label>
              <Input id="name" name="name" defaultValue={facility.name} required />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" defaultValue={facility.contactEmail ?? ""} />
            </div>
            <div>
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" name="contactName" defaultValue={facility.contactName ?? ""} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={facility.notes ?? ""} />
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div>
            <Label>CC Recipients</Label>
            <p className="text-xs text-gray-500 mb-2">These addresses will be CC'd on all outreach emails sent to this facility.</p>
            <CcEmailsEditor
              facilityId={id}
              initialCcEmails={(facility.ccEmails as string[]) ?? []}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
