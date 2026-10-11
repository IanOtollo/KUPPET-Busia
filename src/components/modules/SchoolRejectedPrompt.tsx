"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SchoolPicker } from "@/components/modules/SchoolPicker";
import { SUB_COUNTIES } from "@/lib/constants";

/**
 * Shown on sign-in to a teacher whose school the branch rejected, until they submit
 * the correct, official school. "Later" hides it for the rest of this visit.
 */
export function SchoolRejectedPrompt() {
  const rejected = useQuery(api.schools.myRejectedSchool);
  const correct = useMutation(api.schools.correctMySchool);
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [subCounty, setSubCounty] = useState("");
  const [saving, setSaving] = useState(false);

  if (!rejected) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subCounty) {
      toast.error("Enter your school and choose its sub-county.");
      return;
    }
    setSaving(true);
    try {
      const res = await correct({ name, subCounty: subCounty as never });
      toast.success(`Thank you. Your school is now ${res.name}.`);
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Couldn't update your school.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!dismissed} onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Your school was not accepted</DialogTitle>
          <DialogDescription>
            &ldquo;{rejected.name}&rdquo; could not be confirmed as an official school. Please submit the correct,
            official name of your school.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="fixSchool">Current school / institution</Label>
            <SchoolPicker
              id="fixSchool"
              value={name}
              onChange={setName}
              onPick={(s) => setSubCounty(s.subCounty)}
            />
          </div>
          <div>
            <Label htmlFor="fixSubCounty">Sub-County</Label>
            <NativeSelect id="fixSubCounty" value={subCounty} onChange={(e) => setSubCounty(e.target.value)}>
              <option value="">Select sub-county</option>
              {SUB_COUNTIES.map((sc) => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDismissed(true)}>
              Later
            </Button>
            <Button type="submit" loading={saving} loadingText="Saving…">
              Submit school
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
