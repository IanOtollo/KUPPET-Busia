"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildMemberPrefix, MemberPathContext } from "@/lib/memberPath";
import { formatDate } from "@/lib/format";
import {
  Home,
  HeartHandshake,
  Shield,
  Bus,
  FileText,
  Users,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  LifeBuoy,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useQuery, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NAV_GROUPS = [
  {
    title: "General",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
    ],
  },
  {
    title: "Welfare",
    items: [
      { href: "/bereavement", label: "Bereavement", icon: HeartHandshake },
      { href: "/harassment", label: "Harassment Safe Report", icon: Shield },
    ],
  },
  {
    title: "Services",
    items: [
      { href: "/bus", label: "Union Bus", icon: Bus },
      { href: "/reports", label: "Financial Reports", icon: FileText },
    ],
  },
  {
    title: "Branch",
    items: [
      { href: "/branch/officials", label: "Branch Officials", icon: Users },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export default function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ nameSlug: string; tsc: string }>;
}) {
  const resolvedParams = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();

  const [welfareSheetOpen, setWelfareSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("member_sidebar_collapsed");
    if (stored === "1") setSidebarCollapsed(true);
  }, []);

  const toggleSidebarCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    window.localStorage.setItem("member_sidebar_collapsed", next ? "1" : "0");
  };

  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.users.getMyProfile);
  // Skipped while the profile is loading or locked to a forced password change —
  // every other query would be refused server-side until the password is set.
  const notifications = useQuery(
    api.notifications.listMine,
    profile && !profile.mustChangePassword ? {} : "skip"
  );
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const memberName = profile?.fullName ?? "Member";
  const memberRole = profile?.tscNumber ? `TSC ${profile.tscNumber}` : "Member";
  const memberInitials = (profile?.fullName ?? "M")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Purely cosmetic per-teacher URL prefix — access itself is governed by the
  // Convex Auth session below, never by what's in the address bar. If the
  // prefix in the URL doesn't match the signed-in teacher's own name/TSC
  // (stale link, typo, or someone poking at another teacher's slug), we just
  // correct it back to their own — the underlying page still only ever shows
  // the signed-in user's own data regardless.
  const basePath = useMemo(
    () => (profile ? buildMemberPrefix(profile.fullName, profile.tscNumber) : ""),
    [profile]
  );

  useEffect(() => {
    if (!profile || !basePath) return;
    const currentPrefix = `/${resolvedParams.nameSlug}/${resolvedParams.tsc}`;
    if (currentPrefix !== basePath) {
      const suffix = pathname.slice(currentPrefix.length) || "/dashboard";
      router.replace(`${basePath}${suffix}`);
    }
  }, [profile, basePath, resolvedParams.nameSlug, resolvedParams.tsc, pathname, router]);

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

    // A valid, signed-in account that just isn't a teacher-member (e.g. an
    // admin/official landing here right after login) belongs on /admin, not
    // signed out — only an actual member with a non-active status is blocked.
    if (profile.role !== "member") {
      router.replace("/admin");
      return;
    }
    if (profile.status !== "active") {
      void signOut().finally(() => router.replace(`/login?blocked=${profile.status}`));
      return;
    }
    if (profile.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [authLoading, isAuthenticated, profile, router, signOut]);

  // Hold protected member pages until the authenticated profile is available.
  if (!isAuthenticated || !profile || profile.role !== "member" || profile.status !== "active" || profile.mustChangePassword) {
    return <SecureAccessLoader label="Checking your member access" />;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  };

  const section = pathname.slice(basePath.length) || "/dashboard";
  const isWelfareActive = section.startsWith("/bereavement") || section.startsWith("/harassment");
  const isBusActive = section.startsWith("/bus");
  const isHomeActive = section === "/dashboard";
  const isOfficialsActive = section.startsWith("/branch/officials");
  const isMoreActive =
    section.startsWith("/reports") ||
    section.startsWith("/profile") ||
    section.startsWith("/messages") ||
    section.startsWith("/notifications");

  return (
    <MemberPathContext.Provider value={basePath}>
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col lg:flex-row">
      {/* 1. DESKTOP FIXED SIDEBAR (>=1024px) */}
      <aside
        className={cn(
          "hidden lg:flex h-screen fixed top-0 left-0 flex-col justify-between bg-[var(--ink)] text-[#C8CFD6] z-30 select-none transition-[width] duration-200",
          sidebarCollapsed ? "w-[76px]" : "w-[264px]"
        )}
      >
        {/* Collapse toggle — standalone icon straddling the sidebar edge */}
        <button
          onClick={toggleSidebarCollapsed}
          className="absolute -right-3 top-6 h-6 w-6 flex items-center justify-center rounded-full border border-white/10 bg-[var(--ink)] text-[#8E9CA8] hover:text-white hover:border-white/20 transition-colors cursor-pointer z-10"
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
          {/* Logo block 72px */}
          <div className={cn("h-[72px] flex items-center gap-3 border-b border-white/10", sidebarCollapsed ? "justify-center px-0" : "px-5")}>
            <Image src="/logo.png" alt="KUPPET Logo" width={112} height={56} className="h-14 w-auto object-contain shrink-0" priority />
            <div className={cn(sidebarCollapsed && "hidden")}>
              <span className="block text-[13px] font-semibold tracking-[0.08em] text-white uppercase">
                KUPPET BUSIA
              </span>
              <span className="block text-[11.5px] text-[#8E9CA8]">
                Members Portal
              </span>
            </div>
          </div>

          {/* Navigation links grouped */}
          <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <span className={cn("px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E9CA8] block mb-1.5", sidebarCollapsed && "hidden")}>
                  {group.title}
                </span>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/dashboard"
                        ? section === "/dashboard"
                        : section.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={`${basePath}${item.href}`}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={cn(
                            "relative flex items-center gap-2.5 h-[40px] px-3 rounded-[var(--r-md)] text-[14.5px] font-medium transition-colors",
                            sidebarCollapsed && "justify-center px-0",
                            isActive
                              ? "bg-white/10 text-white font-semibold"
                              : "text-[#C8CFD6] hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--brass)] rounded-r-[var(--r-md)]" />
                          )}
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 stroke-[1.5]",
                              isActive ? "text-[var(--brass)]" : "text-[#8E9CA8]"
                            )}
                          />
                          <span className={cn(sidebarCollapsed && "hidden")}>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Pinned Bottom User Chip */}
        <div className="p-3 border-t border-white/10 relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "w-full flex items-center justify-between p-2 rounded-[var(--r-md)] hover:bg-white/5 transition-colors cursor-pointer text-left",
              sidebarCollapsed && "justify-center"
            )}
          >
            <div className={cn("flex items-center gap-2.5", sidebarCollapsed && "gap-0")}>
              <div className="w-8 h-8 rounded-full bg-[var(--brass)] text-[var(--ink)] font-sans font-semibold text-[13px] flex items-center justify-center overflow-hidden shrink-0">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt={memberName} className="h-full w-full object-cover" />
                ) : (
                  memberInitials
                )}
              </div>
              <div className={cn(sidebarCollapsed && "hidden")}>
                <span className="block text-[13.5px] font-medium text-white truncate max-w-[130px]">
                  {memberName}
                </span>
                <span className="block text-[11.5px] text-[#8E9CA8]">
                  {memberRole}
                </span>
              </div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-[#8E9CA8]", sidebarCollapsed && "hidden")} />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-lg)] shadow-[var(--shadow-panel)] p-1 z-50">
              <Link
                href={`${basePath}/profile`}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] text-[var(--ink-body)] hover:bg-[var(--surface-sunk)] rounded-[var(--r-sm)]"
              >
                <User className="h-4 w-4 text-[var(--ink-muted)]" /> My Profile
              </Link>
              <Link
                href={`${basePath}/notifications`}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] text-[var(--ink-body)] hover:bg-[var(--surface-sunk)] rounded-[var(--r-sm)]"
              >
                <Bell className="h-4 w-4 text-[var(--ink-muted)]" /> Notifications
              </Link>
              <div className="h-px bg-[var(--line)] my-1" />
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  void handleSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13.5px] text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-[var(--r-sm)] cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MOBILE TOP BAR (<1024px) */}
      <header className="lg:hidden sticky top-0 z-30 h-[56px] bg-[var(--surface)] border-b border-[var(--line)] px-4 flex items-center justify-between">
        <Link href={`${basePath}/dashboard`} className="flex min-w-0 items-center gap-2">
          <Image src="/logo.png" alt="KUPPET Busia" width={64} height={32} className="h-8 w-auto shrink-0 object-contain" priority />
          <span className="truncate text-[11px] font-semibold tracking-[0.04em] text-[var(--ink)] uppercase sm:text-[13px] sm:tracking-[0.08em]">
            KUPPET BUSIA
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`${basePath}/notifications`}
            className="relative p-2 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-[var(--r-md)]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
            )}
          </Link>
          <button
            onClick={() => setMoreSheetOpen(true)}
            className="w-8 h-8 rounded-full bg-[var(--union)] text-white font-sans font-semibold text-[12px] flex items-center justify-center cursor-pointer overflow-hidden"
            aria-label="User profile menu"
          >
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt={memberName} className="h-full w-full object-cover" />
            ) : (
              memberInitials
            )}
          </button>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className={cn("flex-1 flex flex-col min-h-screen transition-[margin] duration-200", sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[264px]")}>
        {/* Desktop-only top bar — date, notifications, profile always visible (not tucked in a menu) */}
        <header className="hidden lg:flex h-[60px] bg-[var(--surface)] border-b border-[var(--line)] px-6 items-center justify-end gap-4 sticky top-0 z-20">
          <span className="text-[13px] text-[var(--ink-muted)]">{formatDate(new Date())}</span>
          <Link
            href={`${basePath}/notifications`}
            className="relative p-2 rounded-[var(--r-md)] text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)] transition-colors"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href={`${basePath}/profile`}
            className="w-8 h-8 rounded-full bg-[var(--union)] text-white font-sans font-semibold text-[12px] flex items-center justify-center overflow-hidden shrink-0"
            aria-label="My Profile"
            title="My Profile"
          >
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt={memberName} className="h-full w-full object-cover" />
            ) : (
              memberInitials
            )}
          </Link>
        </header>

        <main className="flex-1 pb-[88px] lg:pb-12">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* 4. MOBILE BOTTOM BAR (<1024px, EXACTLY 5 ITEMS) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-[var(--surface)] border-t border-[var(--line)] shadow-[0_-1px_2px_rgba(16,26,36,0.05)] z-40 flex items-center justify-around px-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Item 1: Home */}
        <Link
          href={`${basePath}/dashboard`}
          className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] py-1 cursor-pointer"
        >
          {isHomeActive && (
            <span className="absolute top-1.5 w-5 h-[3px] bg-[var(--union)] rounded-full" />
          )}
          <Home
            className={cn(
              "h-[22px] w-[22px] stroke-[1.5]",
              isHomeActive ? "text-[var(--union)]" : "text-[var(--ink-muted)]"
            )}
          />
          <span
            className={cn(
              "text-[11px] mt-1",
              isHomeActive
                ? "text-[var(--union)] font-semibold"
                : "text-[var(--ink-muted)] font-normal"
            )}
          >
            Home
          </span>
        </Link>

        {/* Item 2: Welfare (Opens Sheet) */}
        <button
          onClick={() => setWelfareSheetOpen(true)}
          className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] py-1 cursor-pointer"
        >
          {isWelfareActive && (
            <span className="absolute top-1.5 w-5 h-[3px] bg-[var(--union)] rounded-full" />
          )}
          <HeartHandshake
            className={cn(
              "h-[22px] w-[22px] stroke-[1.5]",
              isWelfareActive ? "text-[var(--union)]" : "text-[var(--ink-muted)]"
            )}
          />
          <span
            className={cn(
              "text-[11px] mt-1",
              isWelfareActive
                ? "text-[var(--union)] font-semibold"
                : "text-[var(--ink-muted)] font-normal"
            )}
          >
            Welfare
          </span>
        </button>

        {/* Item 3: Bus */}
        <Link
          href={`${basePath}/bus`}
          className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] py-1 cursor-pointer"
        >
          {isBusActive && (
            <span className="absolute top-1.5 w-5 h-[3px] bg-[var(--union)] rounded-full" />
          )}
          <Bus
            className={cn(
              "h-[22px] w-[22px] stroke-[1.5]",
              isBusActive ? "text-[var(--union)]" : "text-[var(--ink-muted)]"
            )}
          />
          <span
            className={cn(
              "text-[11px] mt-1",
              isBusActive
                ? "text-[var(--union)] font-semibold"
                : "text-[var(--ink-muted)] font-normal"
            )}
          >
            Bus
          </span>
        </Link>

        {/* Item 4: Officials */}
        <Link
          href={`${basePath}/branch/officials`}
          className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] py-1 cursor-pointer"
        >
          {isOfficialsActive && (
            <span className="absolute top-1.5 w-5 h-[3px] bg-[var(--union)] rounded-full" />
          )}
          <Users
            className={cn(
              "h-[22px] w-[22px] stroke-[1.5]",
              isOfficialsActive ? "text-[var(--union)]" : "text-[var(--ink-muted)]"
            )}
          />
          <span
            className={cn(
              "text-[11px] mt-1",
              isOfficialsActive
                ? "text-[var(--union)] font-semibold"
                : "text-[var(--ink-muted)] font-normal"
            )}
          >
            Officials
          </span>
        </Link>

        {/* Item 5: More (Opens Sheet) */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] py-1 cursor-pointer"
        >
          {isMoreActive && (
            <span className="absolute top-1.5 w-5 h-[3px] bg-[var(--union)] rounded-full" />
          )}
          <Menu
            className={cn(
              "h-[22px] w-[22px] stroke-[1.5]",
              isMoreActive ? "text-[var(--union)]" : "text-[var(--ink-muted)]"
            )}
          />
          <span
            className={cn(
              "text-[11px] mt-1",
              isMoreActive
                ? "text-[var(--union)] font-semibold"
                : "text-[var(--ink-muted)] font-normal"
            )}
          >
            More
          </span>
        </button>
      </nav>

      {/* Welfare Mobile Bottom Sheet */}
      <Dialog open={welfareSheetOpen} onOpenChange={setWelfareSheetOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <span className="eyebrow block mb-1">MEMBER WELFARE</span>
            <DialogTitle>Union Welfare Services</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Link
              href={`${basePath}/bereavement`}
              onClick={() => setWelfareSheetOpen(false)}
              className="flex items-start gap-3 p-3.5 rounded-[var(--r-md)] border border-[var(--line)] hover:bg-[var(--surface-sunk)] transition-colors"
            >
              <HeartHandshake className="h-5 w-5 text-[var(--union)] shrink-0 mt-0.5" />
              <div>
                <span className="block font-semibold text-[15px] text-[var(--ink)]">
                  Bereavement Welfare
                </span>
                <span className="block text-[13px] text-[var(--ink-muted)]">
                  File claims for deceased mother, father, spouse, or child.
                </span>
              </div>
            </Link>

            <Link
              href={`${basePath}/harassment`}
              onClick={() => setWelfareSheetOpen(false)}
              className="flex items-start gap-3 p-3.5 rounded-[var(--r-md)] border border-[var(--line)] hover:bg-[var(--surface-sunk)] transition-colors"
            >
              <Shield className="h-5 w-5 text-[var(--union)] shrink-0 mt-0.5" />
              <div>
                <span className="block font-semibold text-[15px] text-[var(--ink)]">
                  Harassment Safe Report
                </span>
                <span className="block text-[13px] text-[var(--ink-muted)]">
                  Confidential workplace harassment reporting with optional anonymity.
                </span>
              </div>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* More Mobile Bottom Sheet */}
      <Dialog open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <span className="eyebrow block mb-1">MEMBER SERVICES</span>
            <DialogTitle>Additional Services</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Link
              href={`${basePath}/reports`}
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <FileText className="h-4 w-4 text-[var(--ink-muted)]" /> Financial Reports
            </Link>
            <Link
              href={`${basePath}/messages`}
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <MessageSquare className="h-4 w-4 text-[var(--ink-muted)]" /> Messages
            </Link>
            <Link
              href={`${basePath}/notifications`}
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <Bell className="h-4 w-4 text-[var(--ink-muted)]" /> Branch Announcements
            </Link>
            <Link
              href={`${basePath}/profile`}
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <User className="h-4 w-4 text-[var(--ink-muted)]" /> My Account & Profile
            </Link>
            <Link
              href={`${basePath}/branch/contact`}
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <LifeBuoy className="h-4 w-4 text-[var(--ink-muted)]" /> Help & Branch Desk
            </Link>
            <div className="h-px bg-[var(--line)] my-2" />
            <button
              onClick={() => {
                setMoreSheetOpen(false);
                void handleSignOut();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-[var(--r-md)] text-[14.5px] text-[var(--danger)] hover:bg-[var(--danger-soft)] font-medium cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </MemberPathContext.Provider>
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
