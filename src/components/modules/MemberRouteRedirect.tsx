"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { buildMemberPrefix } from "@/lib/memberPath";

/**
 * Old un-prefixed member routes (e.g. bare "/dashboard") now just bounce to
 * the signed-in teacher's personalized "/NameSlug/TSC/..." URL — kept around
 * so existing bookmarks, the post-login redirect, and notification links
 * stored before this change still land somewhere valid.
 */
export function MemberRouteRedirect({ section }: { section: string }) {
  const router = useRouter();
  const profile = useQuery(api.users.getMyProfile);

  useEffect(() => {
    if (profile === undefined) return;
    if (profile === null) {
      router.replace("/login");
      return;
    }
    router.replace(`${buildMemberPrefix(profile.fullName, profile.tscNumber)}${section}`);
  }, [profile, section, router]);

  return null;
}
