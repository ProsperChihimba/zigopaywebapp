"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Package, Ship, Users, FileText, CreditCard, ClipboardCheck, LogOut } from "lucide-react";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Dashboard", icon: House },
  { href: "/cargo", label: "Cargo", icon: Package },
  { href: "/shipments", label: "Shipment", icon: Ship },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/release-orders", label: "Release orders", icon: ClipboardCheck },
];

export function Sidebar({ userName, signOutAction }: { userName: string; signOutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:gap-14 lg:py-10">
      <Link href="/" className="px-2">
        <Logo />
      </Link>
      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
              isActive(href)
                ? "border-brand bg-brand-soft font-semibold text-brand"
                : "border-transparent text-muted hover:bg-white hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={isActive(href) ? 2.25 : 1.75} />
            {label}
          </Link>
        ))}
      </nav>
      <form action={signOutAction} className="mt-auto hidden px-2 lg:block">
        <p className="mb-2 truncate text-xs text-muted">{userName}</p>
        <button className="flex items-center gap-2 text-sm text-muted hover:text-ink">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
    </aside>
  );
}
