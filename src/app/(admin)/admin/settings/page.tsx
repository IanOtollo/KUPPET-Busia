"use client";

import { useEffect, useState } from "react";
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
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Settings, Save, Plus, School, Building2, CheckCircle2, XCircle, UserCircle } from "lucide-react";
import { ProfilePhotoUpload } from "@/components/modules/ProfilePhotoUpload";

export default function AdminSettingsPage() {
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSubCounty, setNewSubCounty] = useState<string>("");
  const [isAddingSchool, setIsAddingSchool] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const schools = useQuery(api.schools.list);
  const addSchool = useMutation(api.schools.create);
  const toggleSchoolActive = useMutation(api.schools.toggleActive);

  const branchConfig = useQuery(api.settings.getBranchConfig);
  const saveBranchConfig = useMutation(api.settings.setBranchConfig);
  const confirm = useConfirm();

  const [configForm, setConfigForm] = useState({
    branchName: "",
    busNoticeDays: "3",
    busCapacitySeats: "62",
    contactPhone: "",
    contactEmail: "",
  });

  useEffect(() => {
    if (branchConfig) {
      setConfigForm({
        branchName: branchConfig.branchName,
        busNoticeDays: String(branchConfig.busNoticeDays),
        busCapacitySeats: String(branchConfig.busCapacitySeats),
        contactPhone: branchConfig.contactPhone,
        contactEmail: branchConfig.contactEmail,
      });
    }
  }, [branchConfig]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: "Save branch settings?",
      description: (
        <p>
          The bus capacity ({configForm.busCapacitySeats} seats) and notice period ({configForm.busNoticeDays} days) apply
          to all new bus bookings straight away.
        </p>
      ),
      confirmLabel: "Yes, save settings",
    });
    if (!ok) return;
    setIsSavingConfig(true);
    try {
      await saveBranchConfig({
        branchName: configForm.branchName.trim(),
        busNoticeDays: parseInt(configForm.busNoticeDays, 10) || 3,
        busCapacitySeats: parseInt(configForm.busCapacitySeats, 10) || 62,
        contactPhone: configForm.contactPhone.trim(),
        contactEmail: configForm.contactEmail.trim(),
      });
      toast.success("Branch settings saved successfully.");
    } catch (err: any) {
      toast.error(err.data?.message || err.message || "Failed to save branch settings.");
    } finally {
      setIsSavingConfig(false);
    }
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
    const ok = await confirm({
      title: `Change the status of ${name}?`,
      description: <p>This switches the school between active and inactive in the directory.</p>,
    });
    if (!ok) return;
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

      {/* My Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <UserCircle className="h-5 w-5 text-[var(--union)]" />
            <div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Manage your own account's profile photo.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProfilePhotoUpload />
        </CardContent>
      </Card>

      {/* School Roster Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <School className="h-5 w-5 text-[var(--union)]" />
            <div>
              <CardTitle>School Directory</CardTitle>
              <CardDescription>Add new secondary schools or toggle existing institutions in Busia County.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add School Form */}
          <form onSubmit={handleAddSchool} className="p-4 bg-[var(--surface-sunk)] border border-[var(--line)] rounded-lg space-y-4">
            <div className="font-medium text-sm text-[var(--union)] flex items-center gap-1.5">
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
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] flex justify-between">
              <span>Registered Schools ({schools?.length || 0})</span>
              <span>Status</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto divide-y divide-[var(--line)] border border-[var(--line)] rounded-md">
              {schools && schools.length > 0 ? (
                schools.map((sch) => (
                  <div key={sch._id} className="p-3 flex items-center justify-between hover:bg-[var(--surface-sunk)] text-sm">
                    <div>
                      <span className="font-medium text-[var(--union)]">{sch.name}</span>
                      <span className="ml-2.5 text-xs text-[var(--ink-muted)] px-2 py-0.5 bg-[var(--surface-sunk)] rounded-full">
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
                <div className="p-4 text-center text-sm text-[var(--ink-muted)]">Loading schools directory...</div>
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
              <Input
                id="branchName"
                value={configForm.branchName}
                onChange={(e) => setConfigForm({ ...configForm, branchName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="notice">Bus Advance Notice (Days)</Label>
                <Input
                  id="notice"
                  type="number"
                  value={configForm.busNoticeDays}
                  onChange={(e) => setConfigForm({ ...configForm, busNoticeDays: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="cap">Bus Capacity (Seats)</Label>
                <Input
                  id="cap"
                  type="number"
                  value={configForm.busCapacitySeats}
                  onChange={(e) => setConfigForm({ ...configForm, busCapacitySeats: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Secretariat Contact Phone</Label>
              <Input
                id="phone"
                value={configForm.contactPhone}
                onChange={(e) => setConfigForm({ ...configForm, contactPhone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="email">Secretariat Official Email</Label>
              <Input
                id="email"
                type="email"
                value={configForm.contactEmail}
                onChange={(e) => setConfigForm({ ...configForm, contactEmail: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-[var(--line)] flex justify-end">
              <Button type="submit" loading={isSavingConfig} loadingText="Saving…">
                <Save className="h-4 w-4 mr-1.5" /> Save Configuration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
