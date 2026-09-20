"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatShortDate } from "@/lib/format";
import { Plus, FileText, Upload } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { FINANCIAL_REPORT_CATEGORIES, FinancialReportCategory } from "@/lib/constants";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const reports = useQuery(api.financialReports.listActive, {});
  const createReportMutation = useMutation(api.financialReports.create);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    period: "FY 2025/2026",
    category: "Annual Accounts" as FinancialReportCategory,
    summary: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // In production, upload to Convex storage first. Use dummy storage ID for scaffold build
      const dummyStorageId = "storage_123456789" as Id<"_storage">;
      await createReportMutation({
        title: formData.title,
        period: formData.period,
        category: formData.category,
        summary: formData.summary,
        storageId: dummyStorageId,
        fileSize: 2048576,
        visibility: "members_only",
        publishedAt: new Date().toISOString(),
      });

      toast.success("Financial statement published.");
      setDialogOpen(false);
    } catch {
      toast.error("Failed to publish financial report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Doc<"financialReports">>[] = [
    {
      key: "title",
      header: "Title & Period",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">{item.title}</span>
          <span className="text-[12px] text-[var(--brass)] font-medium">Period: {item.period}</span>
        </div>
      ),
    },
    { key: "category", header: "Category" },
    { key: "downloadCount", header: "Downloads", render: (item) => item.downloadCount },
    { key: "publishedAt", header: "Publish Date", render: (item) => formatShortDate(item.publishedAt) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="TRANSPARENCY"
        title="Financial Reports Management"
        lead="Upload annual accounts, audit reports, quarterly statements, and budget allocations for member access."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Financial Reports" },
        ]}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Publish New Report
          </Button>
        }
      />

      {reports && (
        <DataTable
          columns={columns}
          data={reports}
          keyExtractor={(item) => item._id}
          emptyMessage="No financial reports published yet."
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <span className="eyebrow block mb-1">NEW STATEMENT</span>
            <DialogTitle>Publish Financial Report PDF</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                required
                placeholder="e.g. Busia Branch Audited Accounts FY 2025/2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="period">Financial Period</Label>
                <Input
                  id="period"
                  required
                  placeholder="e.g. Q3 2026 or FY 2025"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="cat">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: FinancialReportCategory) =>
                    setFormData({ ...formData, category: val })
                  }
                >
                  <SelectTrigger id="cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCIAL_REPORT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="pdf">Upload PDF Document</Label>
              <Input id="pdf" type="file" accept=".pdf" />
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} loadingText="Publishing…">
                Publish Statement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

