"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate, formatRelativeTime, formatStay } from "@/lib/format";
import { SUB_COUNTIES, TEACHING_SUBJECTS, JOB_GROUPS, SubCounty, JobGroup } from "@/lib/constants";
import { ArrowRightLeft, Check, Clock, MapPin, MessageSquare, School, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useMemberBasePath } from "@/lib/memberPath";

const errMsg = (err: unknown, fallback: string) => {
  const e = err as { message?: string; data?: { message?: string } };
  return e.data?.message || e.message || fallback;
};

export default function TransfersPage() {
  const basePath = useMemberBasePath();
  const [tab, setTab] = useState<"cases" | "swaps">("cases");

  return (
    <div className="max-w-[960px] mx-auto">
      <PageHeader
        eyebrow="TRANSFERS"
        title="Transfer Cases & School Swaps"
        lead="Track how long you have served at your school, review your transfer history, and find a colleague to swap schools with."
        breadcrumbs={[{ label: "Dashboard", href: `${basePath}/dashboard` }, { label: "Transfers" }]}
      />

      <div
        role="tablist"
        className="inline-flex items-center gap-1 border border-[var(--line)] rounded-[var(--r-md)] bg-[var(--surface)] p-1 mb-6"
      >
        {(
          [
            ["cases", "Transfer Cases"],
            ["swaps", "School Swaps"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-[var(--r-sm)] text-[15px] font-medium transition-colors cursor-pointer ${
              tab === key
                ? "bg-[var(--union)] text-white font-semibold"
                : "text-[var(--ink-body)] hover:bg-[var(--surface-sunk)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cases" ? <TransferCases basePath={basePath} /> : <SchoolSwaps basePath={basePath} />}
    </div>
  );
}

function TransferCases({ basePath }: { basePath: string }) {
  const overview = useQuery(api.transfers.myOverview);
  const updateEmployment = useMutation(api.users.updateMyEmployment);
  const [startDate, setStartDate] = useState("");
  const [jobGroup, setJobGroup] = useState("");
  const [saving, setSaving] = useState(false);

  if (overview === undefined) return <Skeleton className="h-64 w-full" />;

  const selectedJobGroup = jobGroup || overview.jobGroup || "";
  const jobGroupChanged = !!jobGroup && jobGroup !== overview.jobGroup;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateEmployment({
        schoolStartDate: startDate || undefined,
        jobGroup: (jobGroupChanged ? jobGroup : undefined) as JobGroup | undefined,
      });
      toast.success("Your details have been saved.");
    } catch (err) {
      toast.error(errMsg(err, "Could not save your details."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] flex items-center gap-2">
            <School className="h-5 w-5 text-[var(--union)]" /> Your current school
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[15.5px]">
            <div>
              <dt className="text-[13.5px] uppercase font-semibold text-[var(--ink-muted)]">School</dt>
              <dd className="font-medium text-[var(--ink)] mt-0.5">{overview.school}</dd>
              <dd className="text-[14px] text-[var(--ink-muted)]">{overview.subCounty}</dd>
            </div>
            <div>
              <dt className="text-[13.5px] uppercase font-semibold text-[var(--ink-muted)]">Job group</dt>
              <dd className="font-medium text-[var(--ink)] mt-0.5">{overview.jobGroup ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-[13.5px] uppercase font-semibold text-[var(--ink-muted)]">Reported on</dt>
              <dd className="font-medium text-[var(--ink)] mt-0.5">
                {overview.schoolStartDate ? formatShortDate(overview.schoolStartDate) : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt className="text-[13.5px] uppercase font-semibold text-[var(--ink-muted)]">Length of stay</dt>
              <dd className="font-semibold text-[var(--union)] mt-0.5 flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {formatStay(overview.currentStayDays)}
              </dd>
            </div>
          </dl>

          {(
            <form
              onSubmit={handleSave}
              className="pt-4 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-end"
            >
              {!overview.schoolStartDate && (
                <div>
                  <Label htmlFor="startDate">Date you reported to this school</Label>
                  <Input
                    id="startDate"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              )}
              {(
                <div>
                  <Label htmlFor="jobGroup">Job group (update if you are promoted)</Label>
                  <NativeSelect id="jobGroup" value={selectedJobGroup} onChange={(e) => setJobGroup(e.target.value)}>
                    <option value="">Select…</option>
                    {JOB_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
              <Button type="submit" loading={saving} disabled={!startDate && !jobGroupChanged}>
                Save
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-[15px] text-[var(--ink-muted)]">
            <span>Moved to a new school or promoted? Report it so the branch office has your current details.</span>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`${basePath}/profile`}>
                <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Report Transfer / Promotion
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section>
        <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-3">Your transfer history</h3>
        {overview.history.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-[15.5px] text-[var(--ink-muted)]">
              No transfers reported yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {overview.history.map((t) => (
              <Card key={t._id}>
                <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--ink)] block text-[16px]">
                      {t.fromSchool} → {t.toSchool}
                    </span>
                    <span className="text-[14.5px] text-[var(--ink-muted)] block">
                      {t.fromSubCounty} → {t.toSubCounty}
                      {t.effectiveDate ? ` • effective ${formatShortDate(t.effectiveDate)}` : ""}
                    </span>
                    {t.reason && <span className="text-[14.5px] text-[var(--ink-body)] block mt-1">{t.reason}</span>}
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[13px] uppercase font-semibold text-[var(--ink-muted)] block">
                      Stayed at {t.fromSchool}
                    </span>
                    <span className="font-semibold text-[var(--union)]">{formatStay(t.previousStayDays)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SchoolSwaps({ basePath }: { basePath: string }) {
  const profile = useQuery(api.users.getMyProfile);
  const swaps = useQuery(api.swaps.listOpen);
  const createSwap = useMutation(api.swaps.create);
  const closeSwap = useMutation(api.swaps.close);

  const [subjects, setSubjects] = useState<string[] | null>(null);
  const [targetSubCounty, setTargetSubCounty] = useState<SubCounty>("Teso North");
  const [targetSchool, setTargetSchool] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  if (swaps === undefined || profile === undefined) return <Skeleton className="h-64 w-full" />;

  const mine = swaps.find((s) => s.isMine);
  const selectedSubjects = subjects ?? profile?.subjects ?? [];
  const board = swaps.filter((s) => !s.isMine && (filter === "all" || s.subCounty === filter));

  const toggleSubject = (sub: string) =>
    setSubjects(selectedSubjects.includes(sub) ? selectedSubjects.filter((x) => x !== sub) : [...selectedSubjects, sub]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createSwap({
        subjects: selectedSubjects,
        targetSubCounty,
        targetSchool: targetSchool.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success("Your swap request is posted.");
      setTargetSchool("");
      setNote("");
    } catch (err) {
      toast.error(errMsg(err, "Could not post your swap request."));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (id: Id<"swapRequests">) => {
    try {
      await closeSwap({ id });
      toast.success("Swap request closed.");
    } catch (err) {
      toast.error(errMsg(err, "Could not close the request."));
    }
  };

  return (
    <div className="space-y-6">
      {mine ? (
        <Card className="border-[var(--union)]/40">
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Your swap request</h3>
              <Button variant="secondary" size="sm" onClick={() => handleClose(mine._id as Id<"swapRequests">)}>
                Close request
              </Button>
            </div>
            <p className="text-[15.5px] text-[var(--ink-body)]">
              You are at <strong>{mine.school}</strong> ({mine.subCounty}) and want to move to{" "}
              <strong>{mine.targetSubCounty}</strong>
              {mine.targetSchool ? `, ideally ${mine.targetSchool}` : ""}.
            </p>
            <p className="text-[14.5px] text-[var(--ink-muted)]">Subjects: {mine.subjects.join(", ")}</p>
            {mine.note && <p className="text-[14.5px] text-[var(--ink-body)]">{mine.note}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-1">Request a school swap</h3>
            <p className="text-[14.5px] text-[var(--ink-muted)] mb-4">
              You are currently at {profile?.school} ({profile?.subCounty}). Say which sub-county you want to be
              swapped to and we will show you teachers who want to come to yours.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Subjects you teach</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TEACHING_SUBJECTS.map((sub) => {
                    const on = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className={`text-xs px-3 py-1.5 rounded-full border-2 flex items-center gap-1.5 cursor-pointer font-medium transition-all ${
                          on
                            ? "bg-[var(--union)] text-white border-[var(--union)]"
                            : "bg-[var(--surface)] text-[var(--ink-body)] border-[var(--line-strong)] hover:border-[var(--union)]"
                        }`}
                      >
                        {on && <Check className="h-3 w-3" />}
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetSubCounty">Sub-county I want to move to</Label>
                  <NativeSelect
                    id="targetSubCounty"
                    value={targetSubCounty}
                    onChange={(e) => setTargetSubCounty(e.target.value as SubCounty)}
                  >
                    {SUB_COUNTIES.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="targetSchool" optional>
                    Specific school
                  </Label>
                  <Input
                    id="targetSchool"
                    value={targetSchool}
                    onChange={(e) => setTargetSchool(e.target.value)}
                    placeholder="e.g. Amukura Girls"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="note" optional>
                  Note to other teachers
                </Label>
                <Textarea id="note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button type="submit" loading={saving} disabled={selectedSubjects.length === 0}>
                <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Post swap request
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Teachers looking to swap</h3>
          <div className="w-52">
            <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by sub-county">
              <option value="all">All sub-counties</option>
              {SUB_COUNTIES.map((sc) => (
                <option key={sc} value={sc}>
                  From {sc}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {board.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-[15.5px] text-[var(--ink-muted)]">
              No other teachers are looking to swap right now.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {board.map((s) => (
              <Card key={s._id} className={s.isMatch ? "border-[var(--success)] bg-[var(--success-soft)]/30" : ""}>
                <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0 space-y-1">
                    {s.isMatch && (
                      <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[var(--success)]">
                        <Sparkles className="h-3.5 w-3.5" /> Possible swap partner
                      </span>
                    )}
                    <span className="font-semibold text-[var(--ink)] block text-[16px]">
                      {s.memberName}
                      {s.jobGroup ? ` • ${s.jobGroup}` : ""}
                    </span>
                    <span className="text-[14.5px] text-[var(--ink-body)] flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      {s.school} ({s.subCounty}) → wants {s.targetSubCounty}
                      {s.targetSchool ? ` (${s.targetSchool})` : ""}
                    </span>
                    <span className="text-[14px] text-[var(--ink-muted)] block">
                      Teaches: {s.subjects.join(", ")}
                      {s.sharedSubjects.length > 0 ? ` • you share ${s.sharedSubjects.join(", ")}` : ""}
                    </span>
                    {s.note && <span className="text-[14.5px] text-[var(--ink-body)] block">{s.note}</span>}
                    <span className="text-[13px] text-[var(--ink-muted)] block">
                      Posted {formatRelativeTime(s.createdAt)}
                    </span>
                  </div>
                  <Button variant="secondary" size="sm" asChild className="shrink-0">
                    <Link href={`${basePath}/messages?to=${s.memberId}`}>
                      <MessageSquare className="h-4 w-4 mr-1.5" /> Message
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
