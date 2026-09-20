"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Archive, Sparkles, ShieldCheck } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { OFFICIAL_POSITIONS } from "@/lib/constants";

interface OfficialRow {
  _id: Id<"officials">;
  fullName: string;
  position: string;
  responsibilities: string;
  portfolioArea?: string;
  phone?: string;
  email?: string;
  tier: "executive" | "official" | "subcounty";
  displayOrder: number;
  canHandleHarassment: boolean;
  isActive: boolean;
}

export default function AdminOfficialsPage() {
  const officials = useQuery(api.officials.listAllAdmin);
  const createOfficial = useMutation(api.officials.create);
  const updateOfficial = useMutation(api.officials.update);
  const archiveOfficial = useMutation(api.officials.archive);
  const seedDb = useMutation(api.seed.seedDatabase);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"officials"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    position: "Executive Secretary",
    responsibilities: "",
    portfolioArea: "",
    phone: "",
    email: "",
    tier: "executive" as "executive" | "official" | "subcounty",
    displayOrder: 1,
    canHandleHarassment: false,
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedId(null);
    setFormData({
      fullName: "",
      position: "Executive Secretary",
      responsibilities: "",
      portfolioArea: "",
      phone: "",
      email: "",
      tier: "executive",
      displayOrder: (officials?.length || 0) + 1,
      canHandleHarassment: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (official: OfficialRow) => {
    setIsEditing(true);
    setSelectedId(official._id);
    setFormData({
      fullName: official.fullName,
      position: official.position,
      responsibilities: official.responsibilities,
      portfolioArea: official.portfolioArea || "",
      phone: official.phone || "",
      email: official.email || "",
      tier: official.tier,
      displayOrder: official.displayOrder,
      canHandleHarassment: official.canHandleHarassment,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditing && selectedId) {
        await updateOfficial({
          id: selectedId,
          ...formData,
        });
        toast.success("Official profile updated successfully.");
      } else {
        await createOfficial(formData);
        toast.success("New official added to directory.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("An error occurred while saving the official record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: Id<"officials">) => {
    if (!confirm("Are you sure you want to archive this official? They will be hidden from members but preserved for historical audit.")) {
      return;
    }
    try {
      await archiveOfficial({ id });
      toast.success("Official archived (soft deleted).");
    } catch {
      toast.error("Failed to archive official.");
    }
  };

  const handleRunSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDb({ adminEmail: "admin@kuppetbusia.ke", adminFullName: "Branch Secretariat Admin" });
      toast.success(res.message || "Database seeded with branch officials and schools.");
    } catch {
      toast.error("Seed execution failed or database is already seeded.");
    } finally {
      setIsSeeding(false);
    }
  };

  const columns: Column<OfficialRow>[] = [
    {
      key: "displayOrder",
      header: "Order",
      isMono: true,
      className: "w-16",
    },
    {
      key: "fullName",
      header: "Official Name",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">
            {item.fullName}
          </span>
          <span className="text-[12px] text-[var(--ink-muted)]">
            {item.email || "No email"}
          </span>
        </div>
      ),
    },
    {
      key: "position",
      header: "Position / Portfolio",
      render: (item) => (
        <div>
          <span className="font-medium text-[var(--ink-body)] block">
            {item.position}
          </span>
          {item.portfolioArea && (
            <span className="text-[12px] text-[var(--brass)] font-medium">
              {item.portfolioArea}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      render: (item) => (
        <span className="capitalize text-[13px] px-2 py-0.5 rounded bg-[var(--surface-sunk)] border border-[var(--line)]">
          {item.tier}
        </span>
      ),
    },
    {
      key: "canHandleHarassment",
      header: "Harassment Handler",
      render: (item) =>
        item.canHandleHarassment ? (
          <span className="inline-flex items-center gap-1 text-[12.5px] text-[var(--success)] font-medium">
            <ShieldCheck className="h-4 w-4" /> Authorized
          </span>
        ) : (
          <span className="text-[12.5px] text-[var(--ink-muted)]">Standard</span>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (item) => (
        <StatusBadge status={item.isActive ? "active" : "closed"} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(item);
            }}
            title="Edit official"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          {item.isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(item._id);
              }}
              title="Archive official"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Branch Officials Management"
        lead="Configure the branch roster, executive assignments, and portfolio mandates visible to members. Soft-archive preserves historical audit logs."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Officials Directory" },
        ]}
        action={
          <div className="flex items-center gap-3">
            {(!officials || officials.length === 0) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRunSeed}
                loading={isSeeding}
                loadingText="Seeding…"
              >
                <Sparkles className="h-4 w-4 mr-1.5" /> Initialize Default Roster
              </Button>
            )}
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Official
            </Button>
          </div>
        }
      />

      {officials === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={officials}
          keyExtractor={(item) => item._id}
          emptyMessage="No officials found. Click 'Initialize Default Roster' or 'Add Official' above."
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <span className="eyebrow block mb-1">
              {isEditing ? "UPDATE OFFICIAL" : "NEW APPOINTMENT"}
            </span>
            <DialogTitle>
              {isEditing ? "Edit Branch Official" : "Add Branch Official"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="e.g. Rosemary Wandera"
                />
              </div>

              <div>
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  required
                  min={1}
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      displayOrder: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pos">Position / Office</Label>
                <Select
                  value={formData.position}
                  onValueChange={(val) =>
                    setFormData({ ...formData, position: val })
                  }
                >
                  <SelectTrigger id="pos">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFICIAL_POSITIONS.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tier">Tier Level</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(val: "executive" | "official" | "subcounty") =>
                    setFormData({ ...formData, tier: val })
                  }
                >
                  <SelectTrigger id="tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive Committee</SelectItem>
                    <SelectItem value="official">Branch Official</SelectItem>
                    <SelectItem value="subcounty">Sub-County Rep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="portfolio" optional>Portfolio Area / Sub-County</Label>
              <Input
                id="portfolio"
                value={formData.portfolioArea}
                onChange={(e) =>
                  setFormData({ ...formData, portfolioArea: e.target.value })
                }
                placeholder="e.g. County Governance or Teso North"
              />
            </div>

            <div>
              <Label htmlFor="mandate">Responsibilities & Mandate</Label>
              <Textarea
                id="mandate"
                required
                value={formData.responsibilities}
                onChange={(e) =>
                  setFormData({ ...formData, responsibilities: e.target.value })
                }
                placeholder="2–4 sentences describing the portfolio duties so members know who to approach…"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone" optional>Official Telephone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+2547XXXXXXXX"
                />
              </div>

              <div>
                <Label htmlFor="email" optional>Official Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="name@kuppetbusia.ke"
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-start gap-3 p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)]">
                <Checkbox
                  id="harassment"
                  checked={formData.canHandleHarassment}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      canHandleHarassment: !!checked,
                    })
                  }
                />
                <label
                  htmlFor="harassment"
                  className="text-[13px] leading-snug text-[var(--ink-body)] cursor-pointer select-none"
                >
                  <strong>Designated Harassment Grievance Officer:</strong> Grant this official authorization to view and manage sensitive workplace harassment reports under §15.
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                loadingText="Saving…"
              >
                {isEditing ? "Save Changes" : "Create Official"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

