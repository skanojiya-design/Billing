"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/constants";

type NavItem = { href: string; label: string; icon: string; adminOnly?: boolean };
const SECTIONS: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: "📊" },
      { href: "/tracker", label: "Monthly Tracker", icon: "🗓️" },
      { href: "/services", label: "Services", icon: "🔁" },
      { href: "/documents", label: "Documents", icon: "📁" },
      { href: "/alerts", label: "Alerts & Email", icon: "🔔" },
    ],
  },
  {
    heading: "Assets",
    items: [
      { href: "/assets", label: "Assets overview", icon: "📦" },
      { href: "/suppliers", label: "Suppliers", icon: "🏭" },
      { href: "/purchases", label: "Purchases", icon: "🧾" },
      { href: "/devices", label: "Devices", icon: "📟" },
    ],
  },
  {
    items: [{ href: "/team", label: "Team", icon: "👥", adminOnly: true }],
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">r</span>
      <div>
        <p className="text-sm font-semibold leading-tight">roqit Billing</p>
        <p className="text-[11px] text-gray-400 leading-tight">payment tracker</p>
      </div>
    </div>
  );
}

export function Sidebar({ user }: { user: { name: string; email: string; role: Role } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  const sections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.adminOnly || user.role === "ADMIN"),
  })).filter((s) => s.items.length > 0);

  const navList = (
    <nav className="flex-1 space-y-4 overflow-y-auto p-3">
      {sections.map((section, i) => (
        <div key={i} className="space-y-1">
          {section.heading && (
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {section.heading}
            </p>
          )}
          {section.items.map((item) => {
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
        </div>
      ))}
    </nav>
  );

  const footer = (
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
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <Logo />
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer + overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
          <Logo />
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {navList}
        {footer}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-gray-100 px-5">
          <Logo />
        </div>
        {navList}
        {footer}
      </aside>
    </>
  );
}
