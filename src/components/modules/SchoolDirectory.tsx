"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, Pencil, Plus, School, Search, Trash2, XCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { SUB_COUNTIES } from "@/lib/constants";

type Form = { id: Id<"schools"> | null; name: string; subCounty: string };
const EMPTY: Form = { id: null, name: "", subCounty: "" };

/**
 * The branch's school directory: search, add, edit, deactivate and remove.
 * Teachers pick from this list when they register; schools they type that are
 * missing get added here automatically and are flagged for review.
 */
export function SchoolDirectory() {
  const schools = useQuery(api.schools.listWithRosters);
  const addSchool = useMutation(api.schools.create);
  const updateSchool = useMutation(api.schools.update);
  const toggleActive = useMutation(api.schools.toggleActive);
  const removeSchool = useMutation(api.schools.remove);
  const confirm = useConfirm();

  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState("all");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (schools ?? [])
      .filter((s) => (subFilter === "all" || s.subCounty === subFilter) && (!q || s.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schools, search, subFilter]);

  const teacherAdded = (schools ?? []).filter((s) => s.addedBy === "teacher").length;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.subCounty) {
      toast.error("Select a sub-county.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const res = await updateSchool({ id: form.id, name: form.name, subCounty: form.subCounty as never });
        toast.success(res.changed ? "School updated. Its teachers were moved to the corrected name." : "No changes to save.");
      } else {
        await addSchool({ name: form.name, subCounty: form.subCounty as never });
        toast.success(`"${form.name.trim()}" added to the directory.`);
      }
      setForm(null);
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Couldn't save the school.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: Id<"schools">, name: string, isActive: boolean) => {
    const ok = await confirm({
      title: `${isActive ? "Deactivate" : "Activate"} ${name}?`,
      description: (
        <p>
          {isActive
            ? "Teachers will no longer see it as a suggestion when they register. Existing teachers keep it."
            : "Teachers will see it as a suggestion again."}
        </p>
      ),
    });
    if (!ok) return;
    try {
      const active = await toggleActive({ id });
      toast.success(`${name} is now ${active ? "active" : "inactive"}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const remove = async (id: Id<"schools">, name: string) => {
    const ok = await confirm({
      title: `Remove ${name}?`,
      description: <p>This deletes the school from the directory. It can't be undone, but you can add it again later.</p>,
      confirmLabel: "Yes, remove it",
    });
    if (!ok) return;
    try {
      await removeSchool({ id });
      toast.success(`${name} removed.`);
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Couldn't remove the school.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-[var(--union)]" />
            <div>
              <CardTitle>Registered Schools ({schools?.length ?? 0})</CardTitle>
              <CardDescription>
                Teachers pick their school from this list when they register. A school they type that isn&apos;t here
                is added automatically.
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setForm(EMPTY)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add school
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ink-muted)]" />
            <Input
              className="pl-11"
              placeholder="Search schools…"
              aria-label="Search schools"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sm:w-56">
            <NativeSelect aria-label="Filter by sub-county" value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
              <option value="all">All sub-counties</option>
              {SUB_COUNTIES.map((sc) => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {teacherAdded > 0 && (
          <p className="text-[14.5px] text-[var(--ink-muted)]">
            {teacherAdded} school{teacherAdded === 1 ? " was" : "s were"} added by teachers while registering. They are
            marked &ldquo;Added by teacher&rdquo; so you can check the spelling and sub-county.
          </p>
        )}

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-[var(--line)] rounded-md border border-[var(--line)]">
          {schools === undefined ? (
            <div className="p-4 text-center text-[15px] text-[var(--ink-muted)]">Loading schools…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-[15px] text-[var(--ink-muted)]">
              No schools match. Use &ldquo;Add school&rdquo; if it&apos;s missing.
            </div>
          ) : (
            filtered.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-[var(--surface-sunk)]">
                <div className="min-w-0">
                  <span className="block break-words font-medium text-[var(--union)]">{s.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--ink-muted)]">
                    <span className="rounded-full bg-[var(--surface-sunk)] px-2 py-0.5">{s.subCounty}</span>
                    <span>
                      {s.totalTeachers} teacher{s.totalTeachers === 1 ? "" : "s"}
                    </span>
                    {s.addedBy === "teacher" && <Badge variant="neutral">Added by teacher</Badge>}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => setForm({ id: s._id, name: s.name, subCounty: s.subCounty })}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(s._id, s.name, s.isActive)}
                    className={s.isActive ? "text-emerald-700" : "text-amber-700"}
                  >
                    {s.isActive ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-4 w-4" /> Inactive
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${s.name}`}
                    className="text-[var(--danger)]"
                    onClick={() => remove(s._id, s.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit school" : "Add school"}</DialogTitle>
            <DialogDescription>
              {form?.id
                ? "Correct the spelling or sub-county. Every teacher registered at this school is moved to the new name automatically."
                : "Add a secondary school that teachers can pick when they register."}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label htmlFor="dirSchoolName">School name</Label>
                <Input
                  id="dirSchoolName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="dirSchoolSub">Sub-County</Label>
                <NativeSelect
                  id="dirSchoolSub"
                  value={form.subCounty}
                  onChange={(e) => setForm({ ...form, subCounty: e.target.value })}
                >
                  <option value="">Select sub-county</option>
                  {SUB_COUNTIES.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setForm(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} loadingText="Saving…">
                  {form.id ? "Save changes" : "Add school"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
