"use client";

import { useEffect, useState } from "react";
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
  History,
  Settings,
  School,
  Search,
  Menu,
  X,
  LogOut,
  Bell,
  MessageSquare,
} from "lucide-react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Operations Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/schools", label: "Schools & Staff Roster", icon: School },
  { href: "/admin/bereavement", label: "Bereavement Queue", icon: HeartHandshake },
  { href: "/admin/harassment", label: "Harassment Reports", icon: ShieldAlert },
  { href: "/admin/bus", label: "Bus Booking & Fleet", icon: Bus },
  { href: "/admin/officials", label: "Officials Directory", icon: Users },
  { href: "/admin/members", label: "Members Management", icon: UserCheck },
  { href: "/admin/reports", label: "Financial Reports", icon: FileSpreadsheet },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/audit", label: "System Audit Log", icon: History },
  { href: "/admin/settings", label: "Branch Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const { signOut } = useAuthActions();
  const profile = useQuery(api.users.getMyProfile);
  const adminName = profile?.fullName ?? "Branch Administrator";
  const adminEmail = profile?.email ?? "";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  useEffect(() => {
    if (profile === null) {
      router.replace("/admin-login");
    } else if (
      profile &&
      !["official", "admin", "superadmin"].includes(profile.role)
    ) {
      router.replace("/dashboard");
    }
  }, [profile, router]);

  const isAdmin =
    profile && ["official", "admin", "superadmin"].includes(profile.role);

  // Do not mount admin pages until the authoritative Convex role check completes.
  if (!isAdmin) return <SecureAccessLoader label="Preparing the administration workspace" />;

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col lg:flex-row">
      {/* 1. ADMIN DARK SIDEBAR (Desktop 272px, Mobile Drawer) */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-[272px] bg-[var(--ink)] text-[#C8CFD6] z-50 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 select-none",
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div>
          {/* Logo Lockup */}
          <div className="h-[72px] px-6 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="KUPPET Logo" width={84} height={56} className="h-14 w-auto object-contain shrink-0" priority />
              <div>
                <span className="block text-[13px] font-semibold tracking-[0.08em] text-white uppercase">
                  KUPPET BUSIA
                </span>
                <span className="block text-[11px] tracking-[0.14em] text-[var(--brass)] font-semibold uppercase">
                  BRANCH ADMIN
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden text-[#C8CFD6] hover:text-white p-1 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 h-[42px] px-3.5 rounded-[var(--r-md)] text-[14px] font-medium transition-colors",
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
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pinned Bottom User & Sign Out */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-between p-2 rounded-[var(--r-md)] bg-white/5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[var(--brass)] text-[var(--ink)] font-semibold text-[13px] flex items-center justify-center shrink-0">
                BA
              </div>
              <div className="overflow-hidden">
                <span className="block text-[13px] font-medium text-white truncate">
                  {adminName}
                </span>
                <span className="block text-[11px] text-[#8E9CA8] truncate">
                  {adminEmail}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[#8E9CA8] hover:text-[var(--danger)] p-1.5 rounded-[var(--r-sm)] transition-colors cursor-pointer"
              title="Sign out of Admin"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
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
      <div className="flex-1 lg:ml-[272px] flex flex-col min-h-screen">
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
            <div className="relative max-w-[420px] w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" />
              <input
                type="text"
                placeholder="Search cases, members (TSC/Name), bookings…"
                className="h-[36px] w-full pl-9 pr-3 text-[13.5px] rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--union)] focus:ring-2 focus:ring-[rgba(31,61,92,0.12)]"
              />
            </div>
          </div>

          {/* Queue cluster & actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin/bereavement"
              className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--r-full)] bg-[var(--warning-soft)] text-[var(--warning)] text-[12px] font-semibold"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
              <span>Pending Tasks</span>
            </Link>

          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1300px] mx-auto">{children}</div>
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
          <Image src="/logo.png" alt="KUPPET Busia" width={96} height={72} className="relative h-[72px] w-auto animate-pulse object-contain" priority />
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

