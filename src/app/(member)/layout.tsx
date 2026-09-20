"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
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
      { href: "/officials", label: "Branch Officials", icon: Users },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [welfareSheetOpen, setWelfareSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Simulated member profile for header chip (or fetch from Convex)
  const memberName = "Teacher Member";
  const memberRole = "TSC Member";
  const memberInitials = "TM";

  const isWelfareActive =
    pathname.startsWith("/bereavement") || pathname.startsWith("/harassment");
  const isBusActive = pathname.startsWith("/bus");
  const isHomeActive = pathname === "/dashboard";
  const isOfficialsActive = pathname === "/officials";
  const isMoreActive =
    pathname.startsWith("/reports") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/notifications");

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col lg:flex-row">
      {/* 1. DESKTOP FIXED SIDEBAR (>=1024px) */}
      <aside className="hidden lg:flex w-[264px] h-screen fixed top-0 left-0 flex-col justify-between bg-[var(--surface)] border-r border-[var(--line)] z-30 select-none">
        <div>
          {/* Logo block 72px */}
          <div className="h-[72px] px-5 flex items-center gap-3 border-b border-[var(--line)]">
            <div className="w-9 h-9 rounded-[var(--r-md)] bg-[var(--union)] text-white flex items-center justify-center font-serif font-bold text-[18px]">
              K
            </div>
            <div>
              <span className="block text-[13px] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
                KUPPET BUSIA
              </span>
              <span className="block text-[11.5px] text-[var(--ink-muted)]">
                Members Portal
              </span>
            </div>
          </div>

          {/* Navigation links grouped */}
          <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <span className="px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)] block mb-1.5">
                  {group.title}
                </span>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "relative flex items-center gap-2.5 h-[40px] px-3 rounded-[var(--r-md)] text-[14.5px] font-medium transition-colors",
                            isActive
                              ? "bg-[var(--union-soft)] text-[var(--union)] font-semibold"
                              : "text-[var(--ink-body)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--union)] rounded-r-[var(--r-md)]" />
                          )}
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 stroke-[1.5]",
                              isActive ? "text-[var(--union)]" : "text-[var(--ink-muted)]"
                            )}
                          />
                          <span>{item.label}</span>
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
        <div className="p-3 border-t border-[var(--line)] relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--union)] text-white font-sans font-semibold text-[13px] flex items-center justify-center">
                {memberInitials}
              </div>
              <div>
                <span className="block text-[13.5px] font-medium text-[var(--ink)] truncate max-w-[130px]">
                  {memberName}
                </span>
                <span className="block text-[11.5px] text-[var(--ink-muted)]">
                  {memberRole}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-[var(--ink-muted)]" />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-lg)] shadow-[var(--shadow-panel)] p-1 z-50">
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] text-[var(--ink-body)] hover:bg-[var(--surface-sunk)] rounded-[var(--r-sm)]"
              >
                <User className="h-4 w-4 text-[var(--ink-muted)]" /> My Profile
              </Link>
              <Link
                href="/notifications"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] text-[var(--ink-body)] hover:bg-[var(--surface-sunk)] rounded-[var(--r-sm)]"
              >
                <Bell className="h-4 w-4 text-[var(--ink-muted)]" /> Notifications
              </Link>
              <div className="h-px bg-[var(--line)] my-1" />
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push("/login");
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
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--r-md)] bg-[var(--union)] text-white flex items-center justify-center font-serif font-bold text-base">
            K
          </div>
          <span className="text-[13px] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
            KUPPET BUSIA
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative p-2 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-[var(--r-md)]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
          </Link>
          <button
            onClick={() => setMoreSheetOpen(true)}
            className="w-8 h-8 rounded-full bg-[var(--union)] text-white font-sans font-semibold text-[12px] flex items-center justify-center cursor-pointer"
            aria-label="User profile menu"
          >
            {memberInitials}
          </button>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="flex-1 lg:ml-[264px] pb-[88px] lg:pb-12 min-h-screen">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* 4. MOBILE BOTTOM BAR (<1024px, EXACTLY 5 ITEMS) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-[var(--surface)] border-t border-[var(--line)] shadow-[0_-1px_2px_rgba(16,26,36,0.05)] z-40 flex items-center justify-around px-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Item 1: Home */}
        <Link
          href="/dashboard"
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
          href="/bus"
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
          href="/officials"
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
              href="/bereavement"
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
              href="/harassment"
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
              href="/reports"
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <FileText className="h-4 w-4 text-[var(--ink-muted)]" /> Financial Reports
            </Link>
            <Link
              href="/messages"
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <MessageSquare className="h-4 w-4 text-[var(--ink-muted)]" /> Messages
            </Link>
            <Link
              href="/notifications"
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <Bell className="h-4 w-4 text-[var(--ink-muted)]" /> Branch Announcements
            </Link>
            <Link
              href="/profile"
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <User className="h-4 w-4 text-[var(--ink-muted)]" /> My Account & Profile
            </Link>
            <Link
              href="/contact"
              onClick={() => setMoreSheetOpen(false)}
              className="flex items-center gap-3 p-3 rounded-[var(--r-md)] hover:bg-[var(--surface-sunk)] text-[14.5px] text-[var(--ink)] font-medium"
            >
              <LifeBuoy className="h-4 w-4 text-[var(--ink-muted)]" /> Help & Branch Desk
            </Link>
            <div className="h-px bg-[var(--line)] my-2" />
            <button
              onClick={() => {
                setMoreSheetOpen(false);
                router.push("/login");
              }}
              className="w-full flex items-center gap-3 p-3 rounded-[var(--r-md)] text-[14.5px] text-[var(--danger)] hover:bg-[var(--danger-soft)] font-medium cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

