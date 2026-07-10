"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/candidates", label: "Candidates" },
  { href: "/jobs", label: "Jobs" },
  { href: "/clients", label: "Clients" },
];

const allAnalyticsLinks = [
  { href: "/analytics", label: "Overview", elevated: false },
  { href: "/analytics/pipeline", label: "Pipeline", elevated: false },
  { href: "/analytics/candidates", label: "Candidates", elevated: false },
  { href: "/analytics/revenue", label: "Revenue", elevated: true },
];

interface NavBarProps {
  user: { name?: string | null; email?: string | null };
  isElevated: boolean;
}

export function NavBar({ user, isElevated }: NavBarProps) {
  const analyticsLinks = allAnalyticsLinks.filter((l) => !l.elevated || isElevated);
  const pathname = usePathname();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const analyticsRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const analyticsActive = pathname.startsWith("/analytics");

  // Close dropdown on outside click
  useEffect(() => {
    if (!analyticsOpen) return;
    function handleClick(e: MouseEvent) {
      if (analyticsRef.current && !analyticsRef.current.contains(e.target as Node)) {
        setAnalyticsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [analyticsOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  // Close dropdowns on route change
  useEffect(() => {
    setAnalyticsOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-[#0f2a4a]">
      <div className="w-full px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3 shrink-0 select-none">
              <div className="bg-white rounded overflow-hidden flex items-center justify-center" style={{ width: 138, height: 44 }}>
                <Image
                  src="/logo.jpg"
                  alt="Corporate Recruiters Inc."
                  width={190}
                  height={62}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="hidden lg:block text-xs font-medium tracking-widest uppercase text-white/40 leading-none">
                Recruiting CRM
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer",
                      active
                        ? "text-white"
                        : "text-white/60 hover:text-white hover:bg-white/15"
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--cri-blue)]" />
                    )}
                  </Link>
                );
              })}

              {/* Analytics — custom dropdown (avoids Radix hydration conflict) */}
              <div ref={analyticsRef} className="relative">
                <button
                  onClick={() => setAnalyticsOpen((o) => !o)}
                  className={cn(
                    "relative px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 focus:outline-none cursor-pointer",
                    analyticsActive
                      ? "text-white"
                      : "text-white/60 hover:text-white hover:bg-white/15"
                  )}
                >
                  Analytics
                  <ChevronDown className={cn("h-3 w-3 opacity-70 transition-transform", analyticsOpen && "rotate-180")} />
                  {analyticsActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--cri-blue)]" />
                  )}
                </button>

                {analyticsOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-44 rounded border border-slate-200 bg-white shadow-lg py-1 z-50">
                    {analyticsLinks.map((link) => {
                      const active =
                        link.href === "/analytics"
                          ? pathname === "/analytics"
                          : pathname.startsWith(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "block px-4 py-2 text-sm transition-colors hover:bg-slate-50 cursor-pointer",
                            active ? "font-medium text-[var(--cri-blue)]" : "text-slate-700"
                          )}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Global search + Notifications + User menu */}
          <div className="flex items-center gap-2">
            {mounted && <GlobalSearch />}
            {mounted && <NotificationBell />}

            {/* User menu — custom dropdown (avoids Radix hydration conflict) */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 h-8 px-2 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
              >
                <div className="h-6 w-6 rounded-full bg-[var(--cri-blue)] flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-white leading-none">{initials}</span>
                </div>
                <span className="hidden sm:block text-sm">{user.name}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-64 rounded border border-slate-200 bg-white shadow-lg z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 py-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Thin CRI-blue rule at bottom of nav */}
      <div className="h-px w-full bg-[var(--cri-blue)] opacity-30" />
    </header>
  );
}
