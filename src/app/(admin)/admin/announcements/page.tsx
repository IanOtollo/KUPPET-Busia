"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { formatShortDate } from "@/lib/format";
import { Plus, Megaphone } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  ANNOUNCEMENT_PRIORITIES,
  AnnouncementPriority,
  SUB_COUNTIES,
  DESIGNATIONS,
} from "@/lib/constants";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

const ANNOUNCEMENT_CATEGORIES = [
  "General Notice",
  "AGM & Governance",
  "Welfare & Benefits",
  "Fleet & Bus Operations",
  "Financial & Transparency",
  "Training & Development",
];

type AudienceType = "all" | "sub_county" | "designation";

export default function AdminAnnouncementsPage() {
  const announcements = useQuery(api.announcements.listActive, {});
  const createAnnouncement = useMutation(api.announcements.create);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    body: "",
    category: "General Notice",
    priority: "normal" as AnnouncementPriority,
    audienceType: "all" as AudienceType,
    audienceValue: "",
    expiresAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.audienceType !== "all" && !formData.audienceValue) {
      toast.error("Select who this announcement is targeted to.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAnnouncement({
        title: formData.title,
        body: formData.body,
        category: formData.category,
        priority: formData.priority,
        audienceType: formData.audienceType,
        audienceValue: formData.audienceType === "all" ? undefined : formData.audienceValue,
        expiresAt: formData.expiresAt || undefined,
      });

      toast.success("Announcement broadcast published.");
      setDialogOpen(false);
      setFormData({
        title: "",
        body: "",
        category: "General Notice",
        priority: "normal",
        audienceType: "all",
        audienceValue: "",
        expiresAt: "",
      });
    } catch {
      toast.error("Failed to publish announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Doc<"announcements">>[] = [
    {
      key: "title",
      header: "Title & Priority",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">{item.title}</span>
          <span className="capitalize text-[12px] text-[var(--brass)] font-semibold">
            Priority: {item.priority}
          </span>
        </div>
      ),
    },
    { key: "category", header: "Category" },
    { key: "publishedAt", header: "Published", render: (item) => formatShortDate(item.publishedAt) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="COMMUNICATIONS"
        title="Branch Announcements & Banners"
        lead="Publish urgent union notices, AGM dates, and welfare bulletins for member portal display."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Announcements" },
        ]}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Broadcast Notice
          </Button>
        }
      />

      {announcements && (
        <DataTable
          columns={columns}
          data={announcements}
          keyExtractor={(item) => item._id}
          emptyMessage="No active announcements."
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <span className="eyebrow block mb-1">BROADCAST NOTICE</span>
            <DialogTitle>Create Announcement</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="title">Notice Title</Label>
              <Input
                id="title"
                required
                placeholder="e.g. Branch Annual General Meeting Notice 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val: AnnouncementPriority) =>
                    setFormData({ ...formData, priority: val })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal Notice</SelectItem>
                    <SelectItem value="important">Important Bulletin</SelectItem>
                    <SelectItem value="urgent">Urgent Dashboard Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: string) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="body">Notice Content</Label>
              <Textarea
                id="body"
                required
                rows={4}
                placeholder="Write the full announcement text…"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="audienceType">Audience</Label>
                <Select
                  value={formData.audienceType}
                  onValueChange={(val: AudienceType) =>
                    setFormData({ ...formData, audienceType: val, audienceValue: "" })
                  }
                >
                  <SelectTrigger id="audienceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="sub_county">By Sub-County</SelectItem>
                    <SelectItem value="designation">By Designation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.audienceType !== "all" && (
                <div>
                  <Label htmlFor="audienceValue">
                    {formData.audienceType === "sub_county" ? "Sub-County" : "Designation"}
                  </Label>
                  <Select
                    value={formData.audienceValue}
                    onValueChange={(val: string) => setFormData({ ...formData, audienceValue: val })}
                  >
                    <SelectTrigger id="audienceValue">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.audienceType === "sub_county" ? SUB_COUNTIES : DESIGNATIONS).map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="expiresAt" optional>Expires On</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} loadingText="Publishing…">
                Publish Announcement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

