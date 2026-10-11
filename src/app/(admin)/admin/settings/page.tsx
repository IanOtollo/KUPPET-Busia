"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Save, UserCircle, KeyRound } from "lucide-react";
import Link from "next/link";
import { ProfilePhotoUpload } from "@/components/modules/ProfilePhotoUpload";
import { SchoolDirectory } from "@/components/modules/SchoolDirectory";

export default function AdminSettingsPage() {
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // One section at a time, chosen from the tabs.
  const [tab, setTab] = useState<"account" | "branch" | "schools">("account");

  const profile = useQuery(api.users.getMyProfile);
  const updateProfile = useMutation(api.users.updateMyProfile);
  const [accountForm, setAccountForm] = useState({ fullName: "", phone: "", email: "" });
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  useEffect(() => {
    if (profile) setAccountForm({ fullName: profile.fullName, phone: profile.phone, email: profile.email });
  }, [profile]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSavingAccount(true);
    try {
      await updateProfile({
        fullName: accountForm.fullName.trim(),
        phone: accountForm.phone.trim(),
        email: accountForm.email.trim(),
      });
      toast.success("Your details were updated.");
    } catch (err: any) {
      toast.error(err.data?.message || "Couldn't update your details.");
    } finally {
      setIsSavingAccount(false);
    }
  };

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
    const days = Number(configForm.busNoticeDays);
    const seats = Number(configForm.busCapacitySeats);
    if (!Number.isInteger(days) || days < 0 || days > 60) {
      toast.error("Bus notice period must be a whole number of days from 0 to 60.");
      return;
    }
    if (!Number.isInteger(seats) || seats < 1 || seats > 200) {
      toast.error("Bus capacity must be a whole number of seats from 1 to 200.");
      return;
    }
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
        busNoticeDays: days,
        busCapacitySeats: seats,
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

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        eyebrow="SYSTEM CONFIGURATION"
        title="Settings"
        lead="Your own account, the branch portal's rules and contacts, and the directory of registered schools."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Settings" },
        ]}
      />

      {/* Section tabs */}
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-[var(--r-md)] bg-[var(--surface-sunk)] p-1">
        {(
          [
            ["account", "My Account"],
            ["branch", "Branch Settings"],
            ["schools", "Registered Schools"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-[var(--r-sm)] px-3 py-2.5 text-[16px] font-semibold transition-colors cursor-pointer ${
              tab === value ? "bg-[var(--surface)] text-[var(--union)] shadow-sm" : "text-[var(--ink-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
      {/* My Account */}
      <div className={`max-w-2xl space-y-6 ${tab === "account" ? "block" : "hidden"}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <UserCircle className="h-5 w-5 text-[var(--union)]" />
            <div>
              <CardTitle>My Account</CardTitle>
              <CardDescription>Your own name, contacts, photo and password.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProfilePhotoUpload />

          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div>
              <Label htmlFor="acctName">Full name</Label>
              <Input
                id="acctName"
                value={accountForm.fullName}
                onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="acctTsc">TSC number</Label>
              <Input id="acctTsc" value={profile?.tscNumber ?? ""} disabled />
            </div>
            <div>
              <Label htmlFor="acctPhone">Mobile number</Label>
              <Input
                id="acctPhone"
                inputMode="tel"
                value={accountForm.phone}
                onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="acctEmail">Email</Label>
              <Input
                id="acctEmail"
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto" loading={isSavingAccount} loadingText="Saving…" disabled={!profile}>
              <Save className="h-4 w-4 mr-1.5" /> Save my details
            </Button>
          </form>

          <div className="border-t border-[var(--line)] pt-4">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href="/change-password">
                <KeyRound className="h-4 w-4 mr-1.5" /> Change my password
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Branch Portal Settings */}
      <div className={`max-w-2xl space-y-6 ${tab === "branch" ? "block" : "hidden"}`}>

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

      {/* Registered Schools */}
      <div className={tab === "schools" ? "block" : "hidden"}>
        <SchoolDirectory />
      </div>
      </div>
    </div>
  );
}
