"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const TITLES: Record<string, string> = {
  "/": "KUPPET Busia Branch",
  "/login": "Sign In",
  "/register": "Member Registration",
  "/forgot-password": "Reset Password",
  "/officials": "Branch Officials",
  "/branch/officials": "Member Branch Officials",
  "/branch/contact": "Member Branch Contact",
  "/about": "About the Branch",
  "/contact": "Contact the Branch",
  "/privacy": "Privacy Policy",
  "/dashboard": "Member Dashboard",
  "/bereavement": "Bereavement Welfare",
  "/bereavement/new": "Submit Bereavement Claim",
  "/harassment": "Harassment Safe Report",
  "/harassment/new": "Submit Harassment Report",
  "/bus": "Union Bus",
  "/bus/new": "Book Union Bus",
  "/reports": "Financial Reports",
  "/profile": "My Profile",
  "/notifications": "Notifications",
  "/messages": "Messages",
  "/admin": "Admin Operations Dashboard",
  "/admin/schools": "Schools & Staff Directory",
  "/admin/bereavement": "Bereavement Queue",
  "/admin/harassment": "Harassment Reports",
  "/admin/bus": "Bus Booking & Fleet",
  "/admin/officials": "Officials Directory",
  "/admin/members": "Members Management",
  "/admin/reports": "Financial Reports Administration",
  "/admin/announcements": "Announcements",
  "/admin/messages": "Message Centre",
  "/admin/settings": "Branch Settings",
};

// Member routes live under a cosmetic "/NameSlug/TSC/..." prefix (e.g.
// /IanOtolloMarabi/123456/dashboard). Strip it back down to the plain
// section path ("/dashboard") before looking up a title, so every tab keeps
// its own distinct, readable title regardless of which teacher is signed in.
const MEMBER_SECTION_ROOTS = new Set([
  "dashboard",
  "bereavement",
  "harassment",
  "bus",
  "reports",
  "profile",
  "notifications",
  "messages",
  "branch",
]);

function stripMemberPrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3 || !MEMBER_SECTION_ROOTS.has(segments[2])) {
    return pathname;
  }
  return "/" + segments.slice(2).join("/");
}

function getTitle(rawPathname: string) {
  const pathname = stripMemberPrefix(rawPathname);
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/admin/bereavement/")) return "Bereavement Case Review";
  if (pathname.startsWith("/admin/harassment/")) return "Harassment Report Review";
  if (pathname.startsWith("/admin/bus/")) return "Bus Booking Review";
  if (pathname.startsWith("/bereavement/")) return "Bereavement Case";
  if (pathname.startsWith("/harassment/")) return "Harassment Report";
  if (pathname.startsWith("/bus/")) return "Bus Reservation";
  return "KUPPET Busia Branch";
}

export function PageTitle() {
  const pathname = usePathname();
  const profile = useQuery(api.users.getMyProfile);
  const section = stripMemberPrefix(pathname);

  useEffect(() => {
    let title = getTitle(pathname);
    if (profile && section === "/dashboard") {
      title = `${profile.fullName} — Member Portal`;
    } else if (profile && pathname === "/admin") {
      title = profile.role === "official"
        ? `${profile.fullName} — Officials Workspace`
        : `${profile.fullName} — Administration Workspace`;
    }
    document.title = `${title} — KUPPET Busia Branch`;
  }, [pathname, section, profile]);

  return null;
}
