"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircleHeart,
  Landmark,
  Wallet,
  Target,
  Settings,
  Leaf,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/advisor", label: "Advisor", icon: MessageCircleHeart },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-line bg-surface flex flex-col sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-strong text-white btn-accent-text">
          <Leaf size={17} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-ink">Sage</p>
          <p className="text-[11px] text-ink-3 leading-tight">Your financial advisor</p>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-soft text-accent-strong"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-[11px] leading-relaxed text-ink-3">
        Your data stays on this computer. Sage offers education, not licensed
        financial advice.
      </p>
    </aside>
  );
}
