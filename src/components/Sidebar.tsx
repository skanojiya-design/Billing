"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_LABELS, type Role } from "@/lib/constants";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/tracker", label: "Monthly Tracker", icon: "🗓️" },
  { href: "/services", label: "Services", icon: "🔁" },
  { href: "/documents", label: "Documents", icon: "📁" },
  { href: "/alerts", label: "Alerts & Email", icon: "🔔" },
  { href: "/team", label: "Team", icon: "👥", adminOnly: true },
];

export function Sidebar({ user }: { user: { name: string; email: string; role: Role } }) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.adminOnly || user.role === "ADMIN");

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-gray-100">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">r</span>
        <div>
          <p className="text-sm font-semibold leading-tight">roqit Billing</p>
          <p className="text-[11px] text-gray-400 leading-tight">payment tracker</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div className="rounded-lg px-3 py-2">
          <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
          <p className="truncate text-xs text-gray-400">{user.email}</p>
          <p className="mt-1 text-[11px] font-medium text-brand-600">{ROLE_LABELS[user.role]}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn-secondary mt-2 w-full text-sm">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
