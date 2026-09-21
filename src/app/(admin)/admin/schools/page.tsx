"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { SUB_COUNTIES, SubCounty } from "@/lib/constants";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  School as SchoolIcon,
  Plus,
  Users,
  UserCheck,
  Search,
  Building2,
  Phone,
  Mail,
  BookOpen,
  Trophy,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Briefcase,
} from "lucide-react";

export default function AdminSchoolsPage() {
  const [selectedSubCounty, setSelectedSubCounty] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Add School Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSubCounty, setNewSubCounty] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Roster View Modal
  const [selectedSchoolRoster, setSelectedSchoolRoster] = useState<any>(null);

  const schools = useQuery(api.schools.listWithRosters);
  const addSchool = useMutation(api.schools.create);
  const toggleSchoolActive = useMutation(api.schools.toggleActive);

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

    setIsSubmitting(true);
    try {
      await addSchool({
        name: newSchoolName.trim(),
        subCounty: newSubCounty as any,
      });
      toast.success(`"${newSchoolName.trim()}" added to directory.`);
      setNewSchoolName("");
      setNewSubCounty("");
      setIsAddOpen(false);
    } catch (err: any) {
      toast.error(err.data?.message || err.message || "Failed to add school.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: any, name: string) => {
    try {
      const active = await toggleSchoolActive({ id });
      toast.success(`${name} is now ${active ? "Active" : "Inactive"}.`);
    } catch (err: any) {
      toast.error("Failed to update school status.");
    }
  };

  // Filtered schools
  const filteredSchools = (schools || []).filter((school) => {
    const matchesSubCounty =
      selectedSubCounty === "ALL" || school.subCounty === selectedSubCounty;
    const matchesSearch =
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.subCounty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (school.headTeacher?.fullName || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubCounty && matchesSearch;
  });

  const totalSchools = schools?.length || 0;
  const totalTeachersCounty = schools?.reduce((acc, s) => acc + s.totalTeachers, 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="INSTITUTION ROSTERS"
        title="Schools & Staff Directory"
        lead="Comprehensive directory of secondary schools across Busia County, showing institutional leadership, staff strength, and individual teacher roles."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Schools Directory" },
        ]}
        action={
          <Button onClick={() => setIsAddOpen(true)} className="bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]">
            <Plus className="h-4 w-4 mr-1.5" /> Add Secondary School
          </Button>
        }
      />

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-[var(--surface-muted)] text-[var(--navy)] rounded-lg">
            <SchoolIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--navy)]">{totalSchools}</div>
            <div className="text-xs text-[var(--muted)]">Registered Secondary Schools</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-[var(--surface-muted)] text-[var(--navy)] rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--navy)]">{totalTeachersCounty}</div>
            <div className="text-xs text-[var(--muted)]">Total Registered Teachers</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-[var(--surface-muted)] text-[var(--navy)] rounded-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--navy)]">{SUB_COUNTIES.length}</div>
            <div className="text-xs text-[var(--muted)]">Sub-Counties Covered</div>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 border border-[var(--line)] rounded-lg shadow-sm">
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
          <Input
            placeholder="Search school name or principal..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 w-full overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <span className="text-xs text-[var(--muted)] font-medium mr-1 shrink-0">Sub-County:</span>
          <Button
            variant={selectedSubCounty === "ALL" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setSelectedSubCounty("ALL")}
            className="shrink-0"
          >
            All ({totalSchools})
          </Button>
          {SUB_COUNTIES.map((sc) => {
            const count = (schools || []).filter((s) => s.subCounty === sc).length;
            return (
              <Button
                key={sc}
                variant={selectedSubCounty === sc ? "primary" : "secondary"}
                size="sm"
                onClick={() => setSelectedSubCounty(sc)}
                className="shrink-0"
              >
                {sc} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Schools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSchools.map((school) => (
          <Card key={school._id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b border-[var(--line)] bg-[var(--surface-subtle)]">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="neutral" className="mb-1.5 text-xs text-[var(--navy)] bg-white border-[var(--line)]">
                    {school.subCounty}
                  </Badge>
                  <CardTitle className="text-base font-bold text-[var(--navy)] line-clamp-1">
                    {school.name}
                  </CardTitle>
                </div>
                <Badge className={school.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"}>
                  {school.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3 flex-1 text-sm">
              {/* Head Teacher Section */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Headteacher / Principal</span>
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                </div>
                {school.headTeacher ? (
                  <div>
                    <div className="font-semibold text-slate-800">{school.headTeacher.fullName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>TSC: {school.headTeacher.tscNumber}</span>
                      <span>•</span>
                      <span>{school.headTeacher.phone}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Not registered / Unassigned</div>
                )}
              </div>

              {/* Deputy Principal Section */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Deputy Principal</span>
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                </div>
                {school.deputyHead ? (
                  <div>
                    <div className="font-semibold text-slate-800">{school.deputyHead.fullName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>TSC: {school.deputyHead.tscNumber}</span>
                      <span>•</span>
                      <span>{school.deputyHead.phone}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Not registered / Unassigned</div>
                )}
              </div>

              {/* Staff Count Pill */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[var(--muted)]">Total Registered Staff:</span>
                <Badge variant="neutral" className="font-bold text-xs bg-[var(--surface-muted)] text-[var(--navy)]">
                  {school.totalTeachers} {school.totalTeachers === 1 ? "Teacher" : "Teachers"}
                </Badge>
              </div>
            </CardContent>

            <div className="p-4 border-t border-[var(--line)] bg-slate-50/50 flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full flex items-center justify-center gap-1.5 text-xs text-[var(--navy)]"
                onClick={() => setSelectedSchoolRoster(school)}
              >
                <Eye className="h-3.5 w-3.5" /> View Staff Roster ({school.totalTeachers})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => handleToggleStatus(school._id, school.name)}
              >
                {school.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredSchools.length === 0 && (
        <Card className="p-12 text-center text-[var(--muted)] space-y-3">
          <SchoolIcon className="h-12 w-12 mx-auto text-slate-300" />
          <div className="font-semibold text-slate-700">No schools found</div>
          <p className="text-xs max-w-sm mx-auto">
            No secondary schools match your search filter or sub-county selection. Try changing filters or add a new school.
          </p>
        </Card>
      )}

      {/* Add School Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SchoolIcon className="h-5 w-5 text-[var(--navy)]" /> Add Secondary School
            </DialogTitle>
            <DialogDescription>
              Register a new secondary school or institution under Busia County directory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSchool} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="addSchoolName">School Official Name</Label>
              <Input
                id="addSchoolName"
                placeholder="e.g. St. Thomas Aquinas Secondary"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="addSubCounty">Sub-County Jurisdiction</Label>
              <Select value={newSubCounty} onValueChange={setNewSubCounty}>
                <SelectTrigger id="addSubCounty">
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

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add School"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* School Roster Modal */}
      {selectedSchoolRoster && (
        <Dialog open={!!selectedSchoolRoster} onOpenChange={() => setSelectedSchoolRoster(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-[var(--line)] pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="neutral" className="mb-1 text-xs text-[var(--navy)]">
                    {selectedSchoolRoster.subCounty} Sub-County
                  </Badge>
                  <DialogTitle className="text-xl font-bold text-[var(--navy)]">
                    {selectedSchoolRoster.name} — Staff Roster
                  </DialogTitle>
                </div>
                <Badge variant="neutral" className="text-sm px-3 py-1 bg-[var(--surface-muted)] text-[var(--navy)]">
                  {selectedSchoolRoster.totalTeachers} Staff Members
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {selectedSchoolRoster.teachers.length > 0 ? (
                <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-lg">
                  {selectedSchoolRoster.teachers.map((teacher: any) => (
                    <div key={teacher._id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{teacher.fullName}</span>
                          <Badge className="text-[11px] bg-[var(--navy)] text-white">
                            {teacher.schoolRole}
                          </Badge>
                          <Badge variant="neutral" className="text-[11px] border-slate-300">
                            TSC: {teacher.tscNumber}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" /> {teacher.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" /> {teacher.email}
                          </span>
                        </div>

                        {/* Teaching Subjects */}
                        {teacher.subjects && teacher.subjects.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1.5">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                              <BookOpen className="h-3 w-3" /> Subjects:
                            </span>
                            {teacher.subjects.map((sub: string) => (
                              <Badge key={sub} variant="neutral" className="text-[10px] bg-slate-100 text-slate-700">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <Badge
                          className={
                            teacher.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }
                        >
                          {teacher.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-2">
                  <Users className="h-8 w-8 mx-auto text-slate-400" />
                  <div className="font-medium text-slate-700">No teachers currently registered under this school</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When teachers register on the portal and select "{selectedSchoolRoster.name}", their profiles, roles, and subject assignments will automatically appear here.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

