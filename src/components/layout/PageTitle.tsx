"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const TITLES: Record<string, string> = {
  "/": "KUPPET Busia Branch",
  "/login": "Teacher Sign In",
  "/admin-login": "Admin & Officials Sign In",
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
  "/admin/audit": "System Audit Log",
  "/admin/settings": "Branch Settings",
};

function getTitle(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/admin/bereavement/")) return "Bereavement Case Review";
  if (pathname.startsWith("/admin/harassment/")) return "Harassment Report Review";
  if (pathname.startsWith("/admin/bus/")) return "Bus Booking Review";
  if (pathname.startsWith("/harassment/")) return "Harassment Report";
  return "KUPPET Busia Branch";
}

export function PageTitle() {
  const pathname = usePathname();
  const profile = useQuery(api.users.getMyProfile);

  useEffect(() => {
    let title = getTitle(pathname);
    if (profile && pathname === "/dashboard") {
      title = `${profile.fullName} — Member Portal`;
    } else if (profile && pathname === "/admin") {
      title = profile.role === "official"
        ? `${profile.fullName} — Officials Workspace`
        : `${profile.fullName} — Administration Workspace`;
    }
    document.title = `${title} — KUPPET Busia Branch`;
  }, [pathname, profile]);

  return null;
}
