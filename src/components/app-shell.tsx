"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  MapPinned,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import { signOutAction } from "@/modules/auth/actions/session";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, paths: ["/dashboard"] },
  { label: "Sales", href: "/enquiries", icon: MessageSquareText, paths: ["/enquiries", "/customers"] },
  { label: "Tours", href: "/tours", icon: MapPinned, paths: ["/tours", "/packages", "/itineraries", "/quotations", "/bookings"] },
  { label: "Operations", href: "/operations", icon: ClipboardCheck, paths: ["/operations", "/suppliers", "/resources", "/documents"] },
  { label: "Finance", href: "/finance", icon: WalletCards, paths: ["/finance", "/reports"] },
  { label: "Settings", href: "/settings", icon: Settings, paths: ["/settings"] },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { fullName: string; email: string; avatarUrl: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {open ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#123d32] text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <span className="grid size-10 place-items-center rounded-xl bg-white/10">
              <Compass className="size-5 text-[#eac58f]" />
            </span>
            <span>
              <span className="block leading-4">Hineni</span>
              <span className="text-xs font-normal text-white/50">Tour Operations</span>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="rounded-lg p-2 text-white/60 lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
          {navigation.map((item) => {
            const active = item.paths.some(
              (path) => pathname === path || pathname.startsWith(`${path}/`),
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition",
                  active
                    ? "bg-white text-[#123d32] shadow-sm"
                    : "text-white/68 hover:bg-white/8 hover:text-white",
                )}
              >
                <item.icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <form action={signOutAction}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/8">
              <span className="grid size-9 place-items-center rounded-full bg-[#dca45c] text-xs font-bold text-[#123d32]">
                {user.fullName
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.fullName}</span>
                <span className="block truncate text-xs text-white/45">{user.email}</span>
              </span>
              <ChevronDown className="size-4 text-white/40" />
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b bg-[#f4f4ef]/92 px-4 backdrop-blur md:px-8">
          <button
            aria-label="Open navigation"
            className="rounded-xl border bg-white p-2.5 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden min-w-0 flex-1 items-center md:flex">
            <form action="/search" className="flex w-full max-w-xl items-center gap-3 rounded-xl border bg-white px-4">
              <Search className="size-4 text-[#7b8580]" />
              <input
                aria-label="Global search"
                name="q"
                className="h-11 w-full bg-transparent text-sm outline-none"
                placeholder="Search tours, guests, enquiries…"
              />
              <kbd className="rounded-md border bg-[#f7f7f3] px-2 py-0.5 text-[10px] text-[#7b8580]">
                /
              </kbd>
            </form>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/tours/new"
              className="flex h-11 items-center gap-2 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white hover:bg-[#0f4e3d]"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create tour</span>
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative grid size-11 place-items-center rounded-xl border bg-white"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-[#dca45c]" />
            </Link>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
