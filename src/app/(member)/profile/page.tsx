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
import { SCHOOL_ROLES, TEACHING_SUBJECTS } from "@/lib/constants";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import { User, Phone, Mail, School, Briefcase, BookOpen, Edit, Check, Save } from "lucide-react";

export default function MemberProfilePage() {
  const profile = useQuery(api.users.getMyProfile);
  const updateProfile = useMutation(api.users.updateMyProfile);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSchoolRole, setEditSchoolRole] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditSchoolRole(profile.schoolRole || profile.designation || "Teacher");
      setEditPhone(profile.phone || "");
      setEditEmail(profile.email || "");
      setEditSubjects(profile.subjects || []);
    }
  }, [profile]);

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
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Profile" },
        ]}
        action={
          <Button
            onClick={() => setIsEditOpen(true)}
            className="bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]"
          >
            <Edit className="h-4 w-4 mr-1.5" /> Edit Profile & Role
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-[var(--navy)]">
                {profile?.fullName || "Member Teacher"}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>TSC No: <strong className="text-[var(--navy)]">{profile?.tscNumber}</strong></span>
                <span>•</span>
                <span>ID: {profile?.idNumber}</span>
              </CardDescription>
            </div>
            <StatusBadge status={profile?.status || "active"} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Institutional Role & Teaching Subjects Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" /> School Specific Role
              </div>
              <Badge className="bg-[var(--navy)] text-white text-xs px-2.5 py-1">
                {profile?.schoolRole || profile?.designation || "Teacher"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14.5px]">
            <div>
              <Label htmlFor="fullName">Full Name (as per TSC)</Label>
              <Input id="fullName" disabled value={profile?.fullName || ""} className="bg-slate-100" />
            </div>

            <div>
              <Label htmlFor="tsc">TSC Registration Number</Label>
              <Input id="tsc" disabled value={profile?.tscNumber || ""} className="bg-slate-100 font-bold text-[var(--navy)]" />
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
              <Label htmlFor="school">Current School / Institution</Label>
              <Input id="school" disabled value={profile?.school || ""} className="bg-slate-100" />
            </div>

            <div>
              <Label htmlFor="subCounty">Sub-County</Label>
              <Input id="subCounty" disabled value={profile?.subCounty || ""} className="bg-slate-100" />
            </div>

            <div>
              <Label htmlFor="designation">TSC Designation</Label>
              <Input id="designation" disabled value={profile?.designation || ""} className="bg-slate-100" />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--line)] text-xs text-[var(--muted)] flex items-center justify-between">
            <span>To request updates to National ID or TSC number, contact the branch secretariat.</span>
            <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
              <Edit className="h-3.5 w-3.5 mr-1" /> Update Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-[var(--navy)]" /> Edit Teacher Profile & Role
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
                <BookOpen className="h-4 w-4 text-[var(--navy)]" /> Teaching Subject(s)
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
                          ? "bg-[var(--navy)] text-white border-[var(--navy)] font-semibold"
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
              <Button type="submit" disabled={isSaving} className="bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]">
                <Save className="h-4 w-4 mr-1.5" /> {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

