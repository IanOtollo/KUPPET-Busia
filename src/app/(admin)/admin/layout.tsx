"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  HeartHandshake,
  ShieldAlert,
  Bus,
  Users,
  UserCheck,
  FileSpreadsheet,
  Megaphone,
  Settings,
  School,
  Search,
  Menu,
  X,
  LogOut,
  Bell,
  MessageSquare,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRightLeft,
} from "lucide-react";
import { useQuery, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/format";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

type CountKey = "members" | "bereavement" | "harassment" | "bus" | "transfers" | "resets" | "issues";
const NOTIF_DOMAINS: CountKey[] = ["members", "bereavement", "harassment", "bus", "transfers", "resets", "issues"];

const ADMIN_NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  countKey?: CountKey;
}[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/members", label: "Members", icon: UserCheck, countKey: "members" },
  { href: "/admin/schools", label: "Schools & Staff", icon: School },
  { href: "/admin/bereavement", label: "Bereavement Claims", icon: HeartHandshake, countKey: "bereavement" },
  { href: "/admin/harassment", label: "Harassment Reports", icon: ShieldAlert, countKey: "harassment" },
  { href: "/admin/bus", label: "Union Bus", icon: Bus, countKey: "bus" },
  { href: "/admin/password-resets", label: "Password Resets", icon: KeyRound, countKey: "resets" },
  { href: "/admin/officials", label: "Branch Officials", icon: Users },
  { href: "/admin/reports", label: "Financial Reports", icon: FileSpreadsheet },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/transfers", label: "Transfers & Swaps", icon: ArrowRightLeft },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare, countKey: "issues" },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

// The flat list above stays for search; the sidebar shows it in these groups,
// ordered by how often an admin reaches for them.
const ADMIN_NAV_GROUPS: { title: string; hrefs: string[] }[] = [
  { title: "Overview", hrefs: ["/admin"] },
  { title: "People", hrefs: ["/admin/members", "/admin/schools", "/admin/officials", "/admin/password-resets"] },
  { title: "Welfare & Cases", hrefs: ["/admin/bereavement", "/admin/harassment", "/admin/transfers"] },
  { title: "Operations", hrefs: ["/admin/bus", "/admin/reports"] },
  { title: "Communication", hrefs: ["/admin/announcements", "/admin/messages"] },
  { title: "System", hrefs: ["/admin/settings"] },
];

function readLastSeen(userId: string, domain: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(`admin_notif_seen_${userId}_${domain}`);
  return raw ? parseInt(raw, 10) : 0;
}

function writeLastSeen(userId: string, domain: string, ts: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`admin_notif_seen_${userId}_${domain}`, String(ts));
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [lastSeen, setLastSeen] = useState<Record<CountKey, number>>({
    members: 0,
    bereavement: 0,
    harassment: 0,
    bus: 0,
    transfers: 0,
    resets: 0,
    issues: 0,
  });

  const { signOut } = useAuthActions();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.users.getMyProfile);
  const isFullAdmin = !!profile && ["admin", "superadmin"].includes(profile.role);
  const isQueueHandler = !!profile && ["official", "admin", "superadmin"].includes(profile.role);

  // Badges and the notification bell read a small, indexed "pending" feed. The
  // full lists are only subscribed to while the global search box is in use,
  // so large tables aren't streamed to every open admin tab.
  const pending = useQuery(api.adminInbox.pending, isQueueHandler ? {} : "skip");
  const searching = searchQuery.trim().length > 0;
  // Server-side, indexed and capped: the header search never streams whole tables.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const searchHits = useQuery(
    api.adminSearch.search,
    isQueueHandler && debouncedSearch.length >= 2 ? { term: debouncedSearch } : "skip"
  );
  const members = searchHits?.members;
  const bereavementCases = searchHits?.bereavement;
  // Harassment access depends on a per-official flag the client can't cheaply
  // pre-check, and an unauthorized call throws — only admins/superadmins are
  // guaranteed access, so restrict the live count to them.
  const harassmentReports = searchHits?.harassment;
  const busBookings = searchHits?.bus;
  const transfers = useQuery(api.transfers.listAll, isFullAdmin ? {} : "skip");
  const resetRequests = useQuery(api.passwordResets.listOpen, isFullAdmin ? {} : "skip");

  const adminName = profile?.fullName ?? "Executive Secretary";
  const adminRoleLabel = profile?.role ?? "";

  const pendingMembers = useMemo(() => pending?.members ?? [], [pending]);
  const pendingBereavement = useMemo(() => pending?.bereavement ?? [], [pending]);
  const pendingHarassment = useMemo(() => pending?.harassment ?? [], [pending]);
  const pendingBus = useMemo(() => pending?.bus ?? [], [pending]);
  const pendingIssues = useMemo(() => pending?.issues ?? [], [pending]);

  const pendingTransfers = useMemo(
    () => transfers?.filter((t) => !t.acknowledgedAt) ?? [],
    [transfers]
  );

  const pendingResets = useMemo(
    () => resetRequests?.filter((r) => r.status === "requested") ?? [],
    [resetRequests]
  );

  const counts: Record<CountKey, number> = {
    resets: pendingResets.length,
    transfers: pendingTransfers.length,
    members: pendingMembers.length,
    bereavement: pendingBereavement.length,
    harassment: pendingHarassment.length,
    bus: pendingBus.length,
    issues: pendingIssues.length,
  };

  // Load persisted per-admin "last seen" timestamps once signed in.
  useEffect(() => {
    if (!profile) return;
    setLastSeen({
      members: readLastSeen(profile._id, "members"),
      bereavement: readLastSeen(profile._id, "bereavement"),
      harassment: readLastSeen(profile._id, "harassment"),
      bus: readLastSeen(profile._id, "bus"),
      transfers: readLastSeen(profile._id, "transfers"),
      resets: readLastSeen(profile._id, "resets"),
      issues: readLastSeen(profile._id, "issues"),
    });
  }, [profile?._id]);

  // Load persisted sidebar collapse preference after mount (client-only, to
  // avoid a server/client hydration mismatch on the sidebar width).
  useEffect(() => {
    const stored = window.localStorage.getItem("admin_sidebar_collapsed");
    if (stored === "1") setSidebarCollapsed(true);
  }, []);

  // Visiting a domain's own tab counts as having seen it.
  useEffect(() => {
    if (!profile) return;
    const domain: CountKey | null = pathname.startsWith("/admin/members")
      ? "members"
      : pathname.startsWith("/admin/bereavement")
        ? "bereavement"
        : pathname.startsWith("/admin/harassment")
          ? "harassment"
          : pathname.startsWith("/admin/bus")
            ? "bus"
            : pathname.startsWith("/admin/password-resets")
              ? "resets"
              : pathname.startsWith("/admin/messages")
                ? "issues"
                : null;
    if (domain) {
      const now = Date.now();
      const seen: CountKey[] = domain === "members" ? ["members", "transfers"] : [domain];
      for (const d of seen) writeLastSeen(profile._id, d, now);
      setLastSeen((prev) => ({ ...prev, ...Object.fromEntries(seen.map((d) => [d, now])) }));
    }
  }, [pathname, profile?._id]);

  const notifItems = useMemo(() => {
    type Item = { id: string; title: string; subtitle: string; href: string; createdAt: number };
    const items: Item[] = [
      ...pendingMembers.map((m) => ({
        id: `member-${m._id}`,
        title: m.fullName,
        subtitle: `Membership approval • TSC ${m.tscNumber}`,
        href: "/admin/members",
        createdAt: m.createdAt,
      })),
      ...pendingTransfers.map((t) => ({
        id: `transfer-${t._id}`,
        title: `Transfer/promotion: ${t.memberName}`,
        subtitle: `TSC ${t.tscNumber} • ${t.fromSchool} → ${t.toSchool}`,
        href: "/admin/members",
        createdAt: t.createdAt,
      })),
      ...pendingResets.map((r) => ({
        id: `reset-${r._id}`,
        title: `Password reset: ${r.memberName}`,
        subtitle: `TSC ${r.tscNumber} • awaiting your approval`,
        href: "/admin/password-resets",
        createdAt: r.requestedAt,
      })),
      ...pendingBereavement.map((c) => ({
        id: `bereavement-${c._id}`,
        title: `Bereavement: ${c.deceasedName}`,
        subtitle: `${c.reference} • ${c.relationship}`,
        href: `/admin/bereavement/${c._id}`,
        createdAt: c.createdAt,
      })),
      ...pendingHarassment.map((r) => ({
        id: `harassment-${r._id}`,
        title: `Harassment report ${r.reference}`,
        subtitle: r.category,
        href: `/admin/harassment/${r._id}`,
        createdAt: r.createdAt,
      })),
      ...pendingIssues.map((n) => ({
        id: `issue-${n._id}`,
        title: n.title,
        subtitle: `CC • ${n.body}`,
        href: "/admin/messages",
        createdAt: n.createdAt,
      })),
      ...pendingBus.map((b) => ({
        id: `bus-${b._id}`,
        title: `Bus: ${b.destination}`,
        subtitle: `${b.reference} • ${b.requesterName}`,
        href: `/admin/bus/${b._id}`,
        createdAt: b.createdAt,
      })),
    ];
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [pendingMembers, pendingTransfers, pendingResets, pendingBereavement, pendingHarassment, pendingBus, pendingIssues]);

  const unseenCount = NOTIF_DOMAINS.reduce((sum, domain) => {
    const domainCreatedAts =
      domain === "members"
        ? pendingMembers.map((m) => m.createdAt)
        : domain === "bereavement"
          ? pendingBereavement.map((c) => c.createdAt)
          : domain === "harassment"
            ? pendingHarassment.map((r) => r.createdAt)
            : domain === "transfers"
              ? pendingTransfers.map((t) => t.createdAt)
              : domain === "resets"
                ? pendingResets.map((r) => r.requestedAt)
                : domain === "issues"
                  ? pendingIssues.map((n) => n.createdAt)
                  : pendingBus.map((b) => b.createdAt);
    return sum + domainCreatedAts.filter((ts) => ts > (lastSeen[domain] ?? 0)).length;
  }, 0);

  type SearchGroup = "Page" | "Member" | "Bereavement" | "Harassment" | "Bus";
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as { id: string; group: SearchGroup; title: string; subtitle: string; href: string }[];

    const results: { id: string; group: SearchGroup; title: string; subtitle: string; href: string }[] = [];

    for (const item of ADMIN_NAV_ITEMS) {
      if (item.label.toLowerCase().includes(q)) {
        results.push({ id: `page-${item.href}`, group: "Page", title: item.label, subtitle: item.href, href: item.href });
      }
    }

    for (const m of members ?? []) {
      results.push({
        id: `member-${m._id}`,
        group: "Member",
        title: m.fullName,
        subtitle: `TSC ${m.tscNumber} • ID ${m.idNumber}`,
        href: `/admin/members?highlight=${m._id}`,
      });
    }

    for (const c of bereavementCases ?? []) {
      if ([c.reference, c.deceasedName, c.memberNameSnapshot, c.tscSnapshot, c.school].some((v) => v?.toLowerCase().includes(q))) {
        results.push({
          id: `bereavement-${c._id}`,
          group: "Bereavement",
          title: `${c.deceasedName} — ${c.reference}`,
          subtitle: `${c.memberNameSnapshot} • ${c.tscSnapshot}`,
          href: `/admin/bereavement/${c._id}`,
        });
      }
    }

    for (const r of harassmentReports ?? []) {
      if ([r.reference, r.category, r.school].some((v) => v?.toLowerCase().includes(q))) {
        results.push({
          id: `harassment-${r._id}`,
          group: "Harassment",
          title: r.reference,
          subtitle: `${r.category} • ${r.school}`,
          href: `/admin/harassment/${r._id}`,
        });
      }
    }

    for (const b of busBookings ?? []) {
      if ([b.reference, b.destination, b.requesterName, b.school].some((v) => v?.toLowerCase().includes(q))) {
        results.push({
          id: `bus-${b._id}`,
          group: "Bus",
          title: `${b.destination} — ${b.reference}`,
          subtitle: `${b.requesterName} • ${b.school}`,
          href: `/admin/bus/${b._id}`,
        });
      }
    }

    return results.slice(0, 40);
  }, [searchQuery, members, bereavementCases, harassmentReports, busBookings]);

  const searchDropdownOpen = searchFocused && searchQuery.trim().length > 0;

  const handleOpenNotifications = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && profile) {
      const now = Date.now();
      const next: Record<CountKey, number> = { ...lastSeen };
      for (const domain of NOTIF_DOMAINS) {
        writeLastSeen(profile._id, domain, now);
        next[domain] = now;
      }
      setLastSeen(next);
    }
  };

  const toggleSidebarCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    window.localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0");
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  useEffect(() => {
    // Wait for the Convex client's auth state to settle before deciding to
    // bounce — a transient unauthenticated echo right after sign-in must
    // never be treated as "not logged in" (that was the multi-retry bug).
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!profile) return;

    if (!["official", "admin", "superadmin"].includes(profile.role)) {
      router.replace("/dashboard");
      return;
    }
    if (profile.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    // A role check alone isn't enough — a suspended/rejected admin or
    // official must lose access the moment their status changes, not keep
    // riding out their existing session.
    if (profile.status !== "active") {
      void signOut().finally(() => router.replace(`/login?blocked=${profile.status}`));
    }
  }, [authLoading, isAuthenticated, profile, router, signOut]);

  const isAdmin =
    isAuthenticated &&
    profile &&
    ["official", "admin", "superadmin"].includes(profile.role) &&
    profile.status === "active" &&
    !profile.mustChangePassword;

  // Do not mount admin pages until the authoritative Convex role check completes.
  if (!isAdmin) return <SecureAccessLoader label="Preparing the administration workspace" />;

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col lg:flex-row">
      {/* 1. ADMIN DARK SIDEBAR (Desktop 272px / 76px collapsed, Mobile Drawer) */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-[var(--ink)] text-[var(--sidebar-text)] z-50 flex flex-col justify-between transition-[width,transform] duration-200 lg:translate-x-0 select-none",
          sidebarCollapsed ? "lg:w-[76px]" : "lg:w-[272px]",
          "w-[272px]",
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Desktop collapse toggle — a standalone icon straddling the sidebar edge, out of the header's flow entirely */}
        <button
          onClick={toggleSidebarCollapsed}
          className="hidden lg:flex absolute -right-3 top-6 h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[var(--ink)] text-[var(--sidebar-icon)] hover:text-white hover:border-white/20 transition-colors cursor-pointer z-10"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>

        <div>
          {/* Logo Lockup */}
          <div className={cn("h-[64px] flex items-center border-b border-white/10", sidebarCollapsed ? "lg:justify-center lg:px-0 px-6 justify-between" : "px-6 justify-between")}>
            <div className={cn("flex items-center gap-3", sidebarCollapsed && "lg:gap-0")}>
              <Image src="/logo.png" alt="KUPPET Logo" width={112} height={56} className="h-14 w-auto object-contain shrink-0" priority />
              <span className={cn("whitespace-nowrap text-[13.5px] font-semibold tracking-[0.06em] text-white uppercase", sidebarCollapsed && "lg:hidden")}>
                KUPPET BUSIA
              </span>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden text-[var(--sidebar-text)] hover:text-white p-1 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-160px)]">
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.title}>
                {group.hrefs.length > 0 && group.title !== "Overview" && (
                  <span className={cn("mb-1.5 block px-3.5 text-[13.5px] font-semibold uppercase tracking-[0.12em] text-[var(--sidebar-label)]", sidebarCollapsed && "lg:hidden")}>
                    {group.title}
                  </span>
                )}
                {group.title !== "Overview" && sidebarCollapsed && <div className="mx-3 mb-2 hidden h-px bg-white/10 lg:block" />}
                <div className="space-y-1">
            {group.hrefs
              .map((h) => ADMIN_NAV_ITEMS.find((i) => i.href === h)!)
              .filter(Boolean)
              .map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const count = item.countKey ? counts[item.countKey] + (item.countKey === "members" ? counts.transfers : 0) : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 h-[44px] px-3.5 rounded-[var(--r-md)] text-[16px] font-medium transition-colors",
                    sidebarCollapsed && "lg:justify-center lg:px-0",
                    isActive
                      ? "bg-white/15 text-white font-bold"
                      : "text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--brass)] rounded-r-[var(--r-md)]" />
                  )}
                  <span className="relative shrink-0">
                    <Icon
                      className={cn(
                        "h-4 w-4 stroke-[1.5]",
                        isActive ? "text-[var(--brass)]" : "text-[var(--sidebar-icon)]"
                      )}
                    />
                    {sidebarCollapsed && count > 0 && (
                      <span className="lg:grid hidden absolute -top-1.5 -right-1.5 h-3.5 min-w-3.5 place-items-center rounded-full bg-[var(--brass)] px-0.5 text-[8px] font-bold text-[var(--ink)]">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                  <span className={cn(sidebarCollapsed && "lg:hidden")}>{item.label}</span>
                  {count > 0 && (
                    <span className={cn("ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--brass)] px-1 text-[12px] font-bold text-[var(--ink)]", sidebarCollapsed && "lg:hidden")}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              );
            })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div>
          {/* Pinned Bottom User & Sign Out */}
          <div className="p-3 border-t border-white/10">
            <div className={cn("flex items-center justify-between p-2 rounded-[var(--r-md)] bg-white/5", sidebarCollapsed && "lg:justify-center")}>
              <div className={cn("flex items-center gap-2.5 overflow-hidden", sidebarCollapsed && "lg:gap-0")}>
                <div className="w-8 h-8 rounded-full bg-[var(--brass)] text-[var(--ink)] font-semibold text-[14.5px] flex items-center justify-center shrink-0 overflow-hidden">
                  {profile?.photoUrl ? (
                    <img src={profile.photoUrl} alt={adminName} className="h-full w-full object-cover" />
                  ) : (
                    adminName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "BA"
                  )}
                </div>
                <div className={cn("overflow-hidden", sidebarCollapsed && "lg:hidden")}>
                  <span className="block text-[14.5px] font-medium text-white truncate">
                    {adminName}
                  </span>
                  <span className="block text-[12.5px] text-[var(--sidebar-icon)] truncate capitalize">
                    {adminRoleLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className={cn("text-[var(--sidebar-icon)] hover:text-[var(--danger)] p-1.5 rounded-[var(--r-sm)] transition-colors cursor-pointer", sidebarCollapsed && "lg:hidden")}
                title="Sign out of Admin"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* 2. ADMIN MAIN VIEW AREA */}
      <div className={cn("flex-1 flex flex-col min-h-screen transition-[margin] duration-200", sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[272px]")}>
        {/* Admin Top Operations Bar (60px) */}
        <header className="h-[60px] bg-[var(--surface)] border-b border-[var(--line)] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-[var(--ink-body)] hover:text-[var(--ink)] cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global Search Input (420px max) */}
            <div className="relative max-w-[420px] w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchFocused(false);
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === "Enter" && searchResults[0]) {
                    router.push(searchResults[0].href);
                    setSearchFocused(false);
                    setSearchQuery("");
                  }
                }}
                placeholder="Search cases, members (TSC/Name/ID), bookings, or pages…"
                className="h-[36px] w-full pl-9 pr-3 text-[15px] rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--union)] focus:ring-2 focus:ring-[rgba(31,61,92,0.12)]"
              />

              {searchDropdownOpen && (
                <>
                  <div onClick={() => setSearchFocused(false)} className="fixed inset-0 z-40" />
                  <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full max-h-[440px] overflow-y-auto rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
                    {searchResults.length === 0 ? (
                      <p className="p-4 text-center text-[14.5px] text-[var(--ink-muted)]">
                        No matches for "{searchQuery.trim()}".
                      </p>
                    ) : (
                      (["Page", "Member", "Bereavement", "Harassment", "Bus"] as const).map((group) => {
                        const items = searchResults.filter((r) => r.group === group);
                        if (items.length === 0) return null;
                        return (
                          <div key={group}>
                            <div className="sticky top-0 bg-[var(--surface-sunk)] px-4 py-1.5 text-[12.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                              {group === "Page" ? "Jump to page" : `${group}${items.length > 1 ? "s" : ""}`}
                            </div>
                            <ul className="divide-y divide-[var(--line)]">
                              {items.map((r) => (
                                <li key={r.id}>
                                  <Link
                                    href={r.href}
                                    onClick={() => {
                                      setSearchFocused(false);
                                      setSearchQuery("");
                                    }}
                                    className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-[var(--surface-sunk)] transition-colors"
                                  >
                                    <span className="text-[15px] font-medium text-[var(--ink)] truncate">{r.title}</span>
                                    <span className="text-[13.5px] text-[var(--ink-muted)] truncate">{r.subtitle}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Queue cluster & actions */}
          <div className="relative flex items-center gap-4">
            <button
              onClick={handleOpenNotifications}
              className="relative p-2 rounded-[var(--r-md)] text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unseenCount > 0 && (
                <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[11px] font-bold text-white">
                  {unseenCount > 99 ? "99+" : unseenCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div
                  onClick={() => setNotifOpen(false)}
                  className="fixed inset-0 z-40"
                />
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[360px] max-h-[440px] overflow-y-auto rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
                  <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                    <span className="text-[15px] font-semibold text-[var(--ink)]">Pending Tasks</span>
                    <span className="text-[13.5px] text-[var(--ink-muted)]">{notifItems.length} total</span>
                  </div>
                  {notifItems.length === 0 ? (
                    <p className="p-6 text-center text-[15px] text-[var(--ink-muted)]">
                      Nothing pending — you're all caught up.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[var(--line)]">
                      {notifItems.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            onClick={() => setNotifOpen(false)}
                            className="flex flex-col gap-0.5 px-4 py-3 hover:bg-[var(--surface-sunk)] transition-colors"
                          >
                            <span className="text-[15px] font-medium text-[var(--ink)] truncate">{item.title}</span>
                            <span className="text-[13.5px] text-[var(--ink-muted)] truncate">{item.subtitle}</span>
                            <span className="text-[12.5px] text-[var(--ink-muted)] mt-0.5">{formatRelativeTime(item.createdAt)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 p-2 rounded-[var(--r-md)] text-[var(--ink-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] transition-colors cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline text-[14.5px] font-medium">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 outline-none">
          <ConfirmProvider>
            <div className="max-w-[1300px] mx-auto">{children}</div>
          </ConfirmProvider>
        </main>
      </div>
    </div>
  );
}

function SecureAccessLoader({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[var(--canvas)] px-4 py-8">
      <div className="mx-auto flex max-w-lg flex-col items-center pt-[18vh]">
        <div className="relative grid h-28 w-28 place-items-center rounded-full bg-white shadow-[0_12px_36px_rgba(31,61,92,0.14)]">
          <span className="absolute inset-0 rounded-full bg-[var(--union)]/15 animate-ping" />
          <Image src="/logo.png" alt="KUPPET Busia" width={144} height={72} className="relative h-[72px] w-auto animate-pulse object-contain" priority />
        </div>
        <p className="mt-6 text-sm font-medium text-[var(--ink-muted)]">{label}</p>
        <div className="mt-8 w-full space-y-3 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-5">
          <Skeleton className="h-5 w-2/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" />
          <div className="grid grid-cols-3 gap-3 pt-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        </div>
      </div>
    </main>
  );
}
