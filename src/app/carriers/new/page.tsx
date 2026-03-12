"use client";
import { useRouter } from "next/navigation";
import { createCarrier } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewCarrierPage() {
  const router = useRouter();

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
            <Button type="submit" className="w-full">Create Carrier</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
