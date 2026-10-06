"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { buildMemberPrefix } from "@/lib/memberPath";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const pathname = usePathname();
  const isAdminContext = pathname?.startsWith("/admin") ?? false;
  const profile = useQuery(api.users.getMyProfile);

  const isMember = !!profile && profile.role === "member" && profile.status === "active";
  const memberBasePath = isMember ? buildMemberPrefix(profile!.fullName, profile!.tscNumber) : "";

  const dashboardHref = isAdminContext ? "/admin" : isMember ? `${memberBasePath}/dashboard` : profile ? "/dashboard" : "/";
  const dashboardLabel = isAdminContext
    ? "Back to Admin Dashboard"
    : isMember || profile
      ? "Back to My Dashboard"
      : "Back to Home";

  const helpfulLinks = isAdminContext
    ? [
        { href: "/admin/members", label: "Members Management" },
        { href: "/admin/bereavement", label: "Bereavement Queue" },
        { href: "/admin/bus", label: "Bus Booking & Fleet" },
      ]
    : [
        { href: isMember ? `${memberBasePath}/bereavement` : "/bereavement", label: "Bereavement Cases" },
        { href: isMember ? `${memberBasePath}/bus` : "/bus", label: "Bus Reservation" },
        { href: "/officials", label: "Branch Officials" },
      ];

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-6 relative">
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-1.5 text-[14.5px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      <div className="w-full max-w-[480px] text-center">
        <span className="eyebrow block mb-3">ERROR 404</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-bold leading-[1.15] text-[var(--ink)] tracking-[-0.015em] mb-4">
          This page could not be found.
        </h1>
        <p className="text-[16px] leading-relaxed text-[var(--ink-muted)] mb-8">
          {isAdminContext
            ? "The administration page you followed may be expired or the address was mistyped."
            : "The link you followed may be expired or the address was mistyped."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button asChild>
            <Link href={dashboardHref}>
              <ArrowLeft className="h-4 w-4 mr-2" /> {dashboardLabel}
            </Link>
          </Button>
        </div>

        <div className="pt-6 border-t border-[var(--line)]">
          <p className="text-[14px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold mb-3">
            Helpful Portals
          </p>
          <div className="flex justify-center gap-6 text-[15.5px] text-[var(--union)]">
            {helpfulLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:underline">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
