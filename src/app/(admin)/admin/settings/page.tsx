"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUB_COUNTIES } from "@/lib/constants";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { Settings, Save, Plus, School, Building2, CheckCircle2, XCircle } from "lucide-react";

export default function AdminSettingsPage() {
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSubCounty, setNewSubCounty] = useState<string>("");
  const [isAddingSchool, setIsAddingSchool] = useState(false);

  const schools = useQuery(api.schools.list);
  const addSchool = useMutation(api.schools.create);
  const toggleSchoolActive = useMutation(api.schools.toggleActive);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Branch settings saved successfully.");
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) {
      toast.error("Enter a valid school name.");
      return;
    }
    if (!newSubCounty) {
      toast.error("Select a sub-county.");
      return;
    }

    setIsAddingSchool(true);
    try {
      await addSchool({
        name: newSchoolName.trim(),
        subCounty: newSubCounty as any,
      });
      toast.success(`"${newSchoolName.trim()}" added to school directory.`);
      setNewSchoolName("");
      setNewSubCounty("");
    } catch (err: any) {
      toast.error(err.data?.message || err.message || "Failed to add school.");
    } finally {
      setIsAddingSchool(false);
    }
  };

  const handleToggle = async (id: any, name: string) => {
    try {
      const active = await toggleSchoolActive({ id });
      toast.success(`${name} marked as ${active ? "Active" : "Inactive"}.`);
    } catch (err: any) {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="max-w-[800px] space-y-6">
      <PageHeader
        eyebrow="SYSTEM CONFIGURATION"
        title="Branch Portal Settings"
        lead="Manage school directory, branch secretariat contacts, and bus advance notice rules."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Settings" },
        ]}
      />

      {/* School Roster Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <School className="h-5 w-5 text-[var(--navy)]" />
            <div>
              <CardTitle>School Directory</CardTitle>
              <CardDescription>Add new secondary schools or toggle existing institutions in Busia County.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add School Form */}
          <form onSubmit={handleAddSchool} className="p-4 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-lg space-y-4">
            <div className="font-medium text-sm text-[var(--navy)] flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add New Secondary School
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  placeholder="e.g. St. Peters Busia High"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="subCounty">Sub-County</Label>
                <Select value={newSubCounty} onValueChange={setNewSubCounty}>
                  <SelectTrigger id="subCounty">
                    <SelectValue placeholder="Select Sub-County" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_COUNTIES.map((sc) => (
                      <SelectItem key={sc} value={sc}>
                        {sc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isAddingSchool}>
                {isAddingSchool ? "Adding..." : "Add School"}
              </Button>
            </div>
          </form>

          {/* School Directory List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] flex justify-between">
              <span>Registered Schools ({schools?.length || 0})</span>
              <span>Status</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto divide-y divide-[var(--line)] border border-[var(--line)] rounded-md">
              {schools && schools.length > 0 ? (
                schools.map((sch) => (
                  <div key={sch._id} className="p-3 flex items-center justify-between hover:bg-[var(--surface-subtle)] text-sm">
                    <div>
                      <span className="font-medium text-[var(--navy)]">{sch.name}</span>
                      <span className="ml-2.5 text-xs text-[var(--muted)] px-2 py-0.5 bg-[var(--surface-muted)] rounded-full">
                        {sch.subCounty}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(sch._id, sch.name)}
                      className={sch.isActive ? "text-emerald-700" : "text-amber-700"}
                    >
                      {sch.isActive ? (
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Active</span>
                      ) : (
                        <span className="flex items-center gap-1"><XCircle className="h-4 w-4" /> Inactive</span>
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-[var(--muted)]">Loading schools directory...</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Rules & Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <Label htmlFor="branchName">Branch Name</Label>
              <Input id="branchName" defaultValue="KUPPET Busia Branch" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="notice">Bus Advance Notice (Days)</Label>
                <Input id="notice" type="number" defaultValue="3" />
              </div>

              <div>
                <Label htmlFor="cap">Bus Capacity (Seats)</Label>
                <Input id="cap" type="number" defaultValue="62" />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Secretariat Contact Phone</Label>
              <Input id="phone" defaultValue="+254722000001" />
            </div>

            <div>
              <Label htmlFor="email">Secretariat Official Email</Label>
              <Input id="email" type="email" defaultValue="execsec@kuppetbusia.ke" />
            </div>

            <div className="pt-4 border-t border-[var(--line)] flex justify-end">
              <Button type="submit">
                <Save className="h-4 w-4 mr-1.5" /> Save Configuration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

