"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardCheck,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquareText,
  PackageOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { signOutAction } from "@/modules/auth/actions/session";
import { cn } from "@/lib/utils";

const dashboard = { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard };
const navigation = [
  {
    label: "Sales",
    href: "/enquiries",
    icon: MessageSquareText,
    items: [
      { label: "Enquiries", href: "/enquiries", icon: MessageSquareText },
      { label: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    label: "Tours",
    href: "/tours",
    icon: MapPinned,
    items: [
      { label: "Tours", href: "/tours", icon: MapPinned },
      { label: "Packages", href: "/packages", icon: PackageOpen },
      { label: "Itineraries", href: "/itineraries", icon: BookOpenCheck },
      { label: "Quotations", href: "/quotations", icon: FileText },
      { label: "Bookings", href: "/bookings", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Operations",
    href: "/operations",
    icon: ClipboardCheck,
    items: [
      { label: "Tour operations", href: "/operations", icon: ClipboardCheck },
      { label: "Suppliers", href: "/suppliers", icon: BriefcaseBusiness },
      { label: "Resources", href: "/resources", icon: Users },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "Finance",
    href: "/finance",
    icon: WalletCards,
    items: [
      { label: "Finance", href: "/finance", icon: WalletCards },
      { label: "Reports", href: "/reports", icon: FileText },
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    items: [{ label: "System settings", href: "/settings", icon: Settings }],
  },
];

function routeIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { fullName: string; email: string; avatarUrl: string | null };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(navigation.map((group) => group.label));

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("hineni-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const currentLabel = useMemo(() => {
    if (routeIsActive(pathname, dashboard.href)) return dashboard.label;
    for (const group of navigation) {
      const current = group.items.find((item) => routeIsActive(pathname, item.href));
      if (current) return current.label;
    }
    return "Hineni Tour Operations";
  }, [pathname]);

  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("hineni-sidebar-collapsed", String(next));
      return next;
    });
  }

  function toggleGroup(label: string) {
    setOpenGroups((groups) =>
      groups.includes(label) ? groups.filter((group) => group !== label) : [...groups, label],
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f3f4f6] text-gray-700">
      <button
        aria-label="Close navigation"
        className={cn(
          "fixed inset-0 z-40 bg-gray-900/30 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        id="app-sidebar"
        className={cn(
          "absolute inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-hidden rounded-r-2xl bg-white shadow-[2px_0_18px_rgba(15,23,42,0.08)] transition-[width,transform] duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-64",
          collapsed ? "lg:w-20" : "lg:w-64",
        )}
      >
        <div className={cn("flex h-20 shrink-0 items-center px-4", collapsed ? "lg:justify-center" : "justify-between")}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#011478] text-white shadow-sm">
              <Compass className="size-5" />
            </span>
            <span className={cn("min-w-0", collapsed && "lg:hidden")}>
              <span className="block truncate text-lg font-extrabold tracking-tight text-[#011478]">Hineni</span>
              <span className="block truncate text-[11px] font-medium text-gray-500">Tour Operations</span>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
          <Link
            href={dashboard.href}
            title={collapsed ? dashboard.label : undefined}
            className={cn(
              "mb-2 flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
              collapsed && "lg:justify-center lg:px-0",
              routeIsActive(pathname, dashboard.href)
                ? "border border-blue-200 bg-blue-50 text-[#011478]"
                : "text-gray-700 hover:bg-blue-50 hover:text-[#011478]",
            )}
          >
            <dashboard.icon className="size-5 shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>{dashboard.label}</span>
          </Link>

          <div className="space-y-1.5">
            {navigation.map((group) => {
              const active = group.items.some((item) => routeIsActive(pathname, item.href));
              const expanded = openGroups.includes(group.label);
              if (collapsed) {
                return (
                  <Link
                    key={group.label}
                    href={group.href}
                    title={group.label}
                    className={cn(
                      "flex min-h-10 items-center justify-center rounded-lg text-gray-700 transition",
                      active ? "border border-blue-200 bg-blue-50 text-[#011478]" : "hover:bg-blue-50 hover:text-[#011478]",
                    )}
                  >
                    <group.icon className="size-5" />
                  </Link>
                );
              }
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={expanded}
                    className={cn(
                      "flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition",
                      active ? "border border-blue-200 bg-blue-50 text-[#011478]" : "text-gray-700 hover:bg-blue-50 hover:text-[#011478]",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <group.icon className="size-5 shrink-0" />
                      {group.label}
                    </span>
                    <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                  </button>
                  {expanded ? (
                    <div className="ml-5 mt-1 space-y-0.5 border-l border-gray-200 pl-4">
                      {group.items.map((item) => {
                        const childActive = routeIsActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "block rounded-md px-3 py-1.5 text-sm transition",
                              childActive
                                ? "bg-blue-50 font-semibold text-[#011478]"
                                : "text-gray-600 hover:bg-gray-50 hover:text-[#011478]",
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-gray-200 p-3">
          <div className={cn("flex items-center gap-3 rounded-lg bg-gray-50 p-2", collapsed && "lg:justify-center")}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#011478] text-xs font-bold text-white">{initials}</span>
            <span className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <span className="block truncate text-sm font-semibold text-gray-800">{user.fullName}</span>
              <span className="block truncate text-[11px] text-gray-500">{user.email}</span>
            </span>
            <form action={signOutAction} className={cn(collapsed && "lg:hidden")}>
              <button aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-red-600"><LogOut className="size-4" /></button>
            </form>
          </div>
          <form action={signOutAction} className={cn("hidden", collapsed && "lg:block")}>
            <button aria-label="Sign out" title="Sign out" className="mt-2 grid h-9 w-full place-items-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"><LogOut className="size-4" /></button>
          </form>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-[#011478] lg:flex"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            <span className={cn(collapsed && "hidden")}>Collapse menu</span>
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md lg:bg-[#f3f4f6]/90">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              aria-label="Open navigation"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-6" />
            </button>
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-sm font-semibold text-gray-800">{currentLabel}</p>
              <p className="truncate text-[11px] text-gray-500">Hineni Tour Operations</p>
            </div>
            <form action="/search" className="hidden w-full max-w-xl items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 shadow-sm md:flex">
              <Search className="size-4 shrink-0 text-gray-400" />
              <input
                aria-label="Global search"
                name="q"
                className="h-10 w-full border-0 bg-transparent p-0 text-sm outline-none ring-0"
                placeholder="Search tours, guests, enquiries..."
              />
              <kbd className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">/</kbd>
            </form>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/tours/new"
                className="flex h-10 items-center gap-2 rounded-lg bg-[#011478] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00105f]"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Create tour</span>
              </Link>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative grid size-10 place-items-center rounded-lg border border-gray-300 bg-white text-gray-500 shadow-sm hover:text-[#011478]"
              >
                <Bell className="size-[18px]" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-500" />
              </Link>
            </div>
          </div>
        </header>

        <main className="grow px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        <footer className="border-t border-gray-200 px-4 py-4 text-center text-xs text-gray-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Hineni Tour Operations. All rights reserved.
        </footer>
      </div>
    </div>
  );
}