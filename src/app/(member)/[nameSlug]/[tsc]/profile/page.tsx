"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  SCHOOL_ROLES,
  TEACHING_SUBJECTS,
  SUB_COUNTIES,
  DESIGNATIONS,
  JOB_GROUPS,
  type JobGroup,
  type SubCounty,
  type Designation,
} from "@/lib/constants";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import { User, Phone, Mail, School, Briefcase, BookOpen, Edit, Check, Save, ArrowRightLeft } from "lucide-react";
import { SchoolPicker } from "@/components/modules/SchoolPicker";
import { ProfilePhotoUpload } from "@/components/modules/ProfilePhotoUpload";
import { useMemberBasePath } from "@/lib/memberPath";

export default function MemberProfilePage() {
  const basePath = useMemberBasePath();
  const profile = useQuery(api.users.getMyProfile);
  const updateProfile = useMutation(api.users.updateMyProfile);
  const updateEmployment = useMutation(api.users.updateMyEmployment);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSchoolRole, setEditSchoolRole] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editJobGroup, setEditJobGroup] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const reportTransfer = useMutation(api.transfers.report);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [trSchool, setTrSchool] = useState("");
  const [trSubCounty, setTrSubCounty] = useState("");
  const [trDesignation, setTrDesignation] = useState("");
  const [trDate, setTrDate] = useState("");
  const [trReason, setTrReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditSchoolRole(profile.schoolRole || profile.designation || "Teacher");
      setEditPhone(profile.phone || "");
      setEditEmail(profile.email || "");
      setEditJobGroup(profile.jobGroup || "");
      setEditSubjects(profile.subjects || []);
    }
  }, [profile]);

  const openTransfer = () => {
    setTrSchool(profile?.school || "");
    setTrSubCounty(profile?.subCounty || "");
    setTrDesignation(profile?.designation || "");
    setTrDate("");
    setTrReason("");
    setIsTransferOpen(true);
  };

  const handleReportTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReporting(true);
    try {
      await reportTransfer({
        school: trSchool,
        subCounty: trSubCounty as SubCounty,
        designation: trDesignation as Designation,
        effectiveDate: trDate || undefined,
        reason: trReason || undefined,
      });
      toast.success("Recorded. The branch office has been notified.");
      setIsTransferOpen(false);
    } catch (err: any) {
      toast.error(err.data?.message || err.message || "Failed to report transfer.");
    } finally {
      setIsReporting(false);
    }
  };

  const toggleSubject = (sub: string) => {
    if (editSubjects.includes(sub)) {
      setEditSubjects(editSubjects.filter((s) => s !== sub));
    } else {
      setEditSubjects([...editSubjects, sub]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        schoolRole: editSchoolRole,
        phone: editPhone,
        email: editEmail,
        subjects: editSubjects,
      });
      if (editJobGroup && editJobGroup !== profile?.jobGroup) {
        await updateEmployment({ jobGroup: editJobGroup as JobGroup });
      }
      toast.success("Profile updated successfully!");
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error(err.data?.message || err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (profile === undefined) {
    return (
      <div className="max-w-[760px] mx-auto space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto space-y-6">
      <PageHeader
        eyebrow="MEMBER RECORD"
        title="My Profile & TSC Registration"
        lead="Your official trade union membership record, teaching subjects, and institutional responsibility on file with KUPPET Busia Branch."
        breadcrumbs={[
          { label: "Dashboard", href: `${basePath}/dashboard` },
          { label: "My Profile" },
        ]}
        action={
          <Button
            onClick={() => setIsEditOpen(true)}
            className="bg-[var(--union)] text-white hover:bg-[var(--union-hover)]"
          >
            <Edit className="h-4 w-4 mr-1.5" /> Edit Profile & Role
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-[var(--union)]">
                {profile?.fullName || "Member Teacher"}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>TSC No: <strong className="text-[var(--union)]">{profile?.tscNumber}</strong></span>
                <span>•</span>
                <span>ID: {profile?.idNumber}</span>
              </CardDescription>
            </div>
            <StatusBadge status={profile?.status || "active"} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <ProfilePhotoUpload />

          {/* Institutional Role & Teaching Subjects Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" /> School Specific Role
              </div>
              <Badge className="bg-[var(--union)] text-white text-xs px-2.5 py-1">
                {profile?.schoolRole || profile?.designation || "Teacher"}
              </Badge>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" /> Job Group
              </div>
              <Badge className="bg-[var(--union)] text-white text-xs px-2.5 py-1">
                {profile?.jobGroup || "Not set"}
              </Badge>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" /> Teaching Subject(s)
              </div>
              {profile?.subjects && profile.subjects.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {profile.subjects.map((sub: string) => (
                    <Badge key={sub} variant="neutral" className="text-xs bg-white border border-slate-300 text-slate-700">
                      {sub}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No subjects specified yet</span>
              )}
            </div>
          </div>

          {/* Full Membership Information Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[16px]">
            <div>
              <Label htmlFor="fullName">Full Name (as per TSC)</Label>
              <Input id="fullName" disabled value={profile?.fullName || ""} className="bg-slate-100" />
            </div>

            <div>
              <Label htmlFor="tsc">TSC Registration Number</Label>
              <Input id="tsc" disabled value={profile?.tscNumber || ""} className="bg-slate-100 font-bold text-[var(--union)]" />
            </div>

            <div>
              <Label htmlFor="idNum">National ID Number</Label>
              <Input id="idNum" disabled value={profile?.idNumber || ""} className="bg-slate-100" />
            </div>

            <div>
              <Label htmlFor="phone">Mobile Phone Number</Label>
              <Input id="phone" disabled value={profile?.phone || ""} className="bg-slate-100" />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" disabled value={profile?.email || ""} className="bg-slate-100" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="school">Current School / Institution</Label>
                <button
                  type="button"
                  onClick={openTransfer}
                  className="text-[14px] font-medium text-[var(--union)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="h-3 w-3" /> Change
                </button>
              </div>
              <Input id="school" disabled value={profile?.school || ""} className="bg-slate-100" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="subCounty">Sub-County</Label>
                <button
                  type="button"
                  onClick={openTransfer}
                  className="text-[14px] font-medium text-[var(--union)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="h-3 w-3" /> Change
                </button>
              </div>
              <Input id="subCounty" disabled value={profile?.subCounty || ""} className="bg-slate-100" />
            </div>

            <div>
              <Label htmlFor="designation">TSC Designation</Label>
              <Input id="designation" disabled value={profile?.designation || ""} className="bg-slate-100" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--union-soft)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[14.5px] text-[var(--ink-body)]">
              <strong className="block text-[var(--ink)]">Transferred or promoted?</strong>
              Update your school, sub-county or designation. The branch office is notified automatically.
            </div>
            <Button onClick={openTransfer} className="bg-[var(--union)] text-white hover:bg-[var(--union-hover)] shrink-0">
              <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Report Transfer / Promotion
            </Button>
          </div>

          <div className="pt-4 border-t border-[var(--line)] text-xs text-[var(--ink-muted)] flex items-center justify-between gap-3">
            <span>To request updates to your name, National ID or TSC number, contact the branch secretariat.</span>
            <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
              <Edit className="h-3.5 w-3.5 mr-1" /> Update Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transfer / Promotion Modal */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-[var(--union)]" /> Report Transfer / Promotion
            </DialogTitle>
            <DialogDescription>
              Enter your new posting. It takes effect on your record immediately and the branch office is notified.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportTransfer} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="trSchool">New School / Institution</Label>
              <SchoolPicker
                id="trSchool"
                value={trSchool}
                onChange={setTrSchool}
                onPick={(s) => setTrSubCounty(s.subCounty)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="trSubCounty">Sub-County</Label>
                <Select value={trSubCounty} onValueChange={setTrSubCounty}>
                  <SelectTrigger id="trSubCounty">
                    <SelectValue placeholder="Select sub-county" />
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

              <div>
                <Label htmlFor="trDesignation">TSC Designation</Label>
                <Select value={trDesignation} onValueChange={setTrDesignation}>
                  <SelectTrigger id="trDesignation">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="trDate">Effective date (optional)</Label>
              <Input id="trDate" type="date" value={trDate} onChange={(e) => setTrDate(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="trReason">Note to the branch office (optional)</Label>
              <Input
                id="trReason"
                value={trReason}
                onChange={(e) => setTrReason(e.target.value)}
                placeholder="e.g. TSC posting letter, promoted to Deputy Principal"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsTransferOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isReporting || !trSubCounty || !trDesignation}
                className="bg-[var(--union)] text-white hover:bg-[var(--union-hover)]"
              >
                <Save className="h-4 w-4 mr-1.5" /> {isReporting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-[var(--union)]" /> Edit Teacher Profile & Role
            </DialogTitle>
            <DialogDescription>
              Update your school responsibility role, contact details, and teaching subjects.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="editRole">Institutional Responsibility / Specific Role</Label>
              <Select value={editSchoolRole} onValueChange={setEditSchoolRole}>
                <SelectTrigger id="editRole">
                  <SelectValue placeholder="Select specific school role" />
                </SelectTrigger>
                <SelectContent>
                  {SCHOOL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editJobGroup">Job Group (update when you are promoted)</Label>
              <Select value={editJobGroup} onValueChange={setEditJobGroup}>
                <SelectTrigger id="editJobGroup">
                  <SelectValue placeholder="Select job group" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editPhone">Mobile Phone</Label>
                <Input
                  id="editPhone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="editEmail">Email Address</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5 mb-1">
                <BookOpen className="h-4 w-4 text-[var(--union)]" /> Teaching Subject(s)
              </Label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                {TEACHING_SUBJECTS.map((sub) => {
                  const isSelected = editSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-[var(--union)] text-white border-[var(--union)] font-semibold"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[var(--union)] text-white hover:bg-[var(--union-hover)]">
                <Save className="h-4 w-4 mr-1.5" /> {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

