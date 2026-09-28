"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { UserRound, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProfilePhotoUpload() {
  const profile = useQuery(api.users.getMyProfile);
  const generateUploadUrl = useMutation(api.users.generateMyPhotoUploadUrl);
  const updateProfile = useMutation(api.users.updateMyProfile);
  const removePhoto = useMutation(api.users.removeMyPhoto);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Profile photos must be 5 MB or smaller.");
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();
      await updateProfile({ photoStorageId: storageId });
      toast.success("Profile photo updated.");
    } catch {
      toast.error("Failed to upload profile photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove your profile photo?")) return;
    setIsRemoving(true);
    try {
      await removePhoto();
      toast.success("Profile photo removed.");
    } catch {
      toast.error("Failed to remove profile photo.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface-sunk)] p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--brass)]/50 bg-[var(--surface)] text-[var(--union)]">
        {profile?.photoUrl ? (
          <img src={profile.photoUrl} alt="Profile photo" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-[13.5px] font-medium text-[var(--ink)]">Profile Photo</p>
          <p className="text-[11.5px] text-[var(--ink-muted)]">JPG, PNG, or WebP up to 5 MB.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isUploading}
            loadingText="Uploading…"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {profile?.photoUrl ? "Change Photo" : "Upload Photo"}
          </Button>
          {profile?.photoUrl && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              loading={isRemoving}
              loadingText="Removing…"
              onClick={handleRemove}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
