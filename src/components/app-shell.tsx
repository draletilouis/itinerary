"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BookOpenCheck, BriefcaseBusiness, ChevronDown, ClipboardCheck, Compass, FileText, LayoutDashboard, LogOut, MapPinned, Menu, MessageSquareText, MoreHorizontal, PackageOpen, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Users, WalletCards, X } from "lucide-react";
import { signOutAction } from "@/modules/auth/actions/session";
import { cn } from "@/lib/utils";

const primary = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Enquiries", href: "/enquiries", icon: MessageSquareText },
  { label: "Tours", href: "/tours", icon: MapPinned },
  { label: "Bookings", href: "/bookings", icon: BriefcaseBusiness },
  { label: "Finance", href: "/finance", icon: WalletCards },
];
const more = [
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Packages", href: "/packages", icon: PackageOpen },
  { label: "Operations", href: "/operations", icon: ClipboardCheck },
  { label: "Suppliers", href: "/suppliers", icon: BriefcaseBusiness },
  { label: "Resources", href: "/resources", icon: Users },
  { label: "Itineraries", href: "/itineraries", icon: BookOpenCheck },
  { label: "Quotations", href: "/quotations", icon: FileText },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

const active = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function AppShell({ children, user }: { children: React.ReactNode; user: { fullName: string; email: string; avatarUrl: string | null } }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => setCollapsed(window.localStorage.getItem("hineni-sidebar-collapsed") === "true"), []);
  const current = [...primary, ...more].find((item) => active(pathname, item.href));
  const expanded = moreOpen || more.some((item) => active(pathname, item.href));
  function toggleCollapsed() { setCollapsed((value) => { const next = !value; window.localStorage.setItem("hineni-sidebar-collapsed", String(next)); return next; }); }
  const initials = user.fullName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="flex min-h-[100dvh] bg-[#f3f4f6] text-gray-700">
      <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className={cn("fixed inset-0 z-40 bg-gray-900/30 transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white transition-[width,transform] lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full", collapsed ? "lg:w-20" : "lg:w-64")}>
        <div className="flex h-20 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[#011478] text-white"><Compass className="size-5" /></span><span><span className="block text-lg font-extrabold text-[#011478]">Hineni</span><span className="block text-[11px] text-gray-500">Tour Operations</span></span></Link>
          <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Daily work</p>
          <div className="space-y-1">
            {primary.map((item) => <NavLink key={item.href} item={item} selected={active(pathname, item.href)} />)}
          </div>
          <div className="mt-4 border-t pt-4">
            <button type="button" aria-expanded={expanded} onClick={() => setMoreOpen((value) => !value)} className={cn("flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-medium hover:bg-blue-50 hover:text-[#011478]", more.some((item) => active(pathname, item.href)) && "bg-blue-50 text-[#011478]")}>
              <span className="flex items-center gap-3"><MoreHorizontal className="size-5" /> More</span><ChevronDown className={cn("size-4 transition-transform", moreOpen && "rotate-180")} />
            </button>
            {expanded ? <div className="ml-5 mt-1 space-y-0.5 border-l pl-4">{more.map((item) => <NavLink key={item.href} item={item} selected={active(pathname, item.href)} compact />)}</div> : null}
          </div>
        </nav>
        <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className="mx-3 mb-3 hidden h-9 items-center justify-center gap-2 rounded-lg border text-xs font-semibold text-gray-500 hover:bg-gray-50 lg:flex">{collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}<span className={cn(collapsed && "lg:hidden")}>Collapse</span></button>
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#011478] text-xs font-bold text-white">{initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-800">{user.fullName}</span><span className="block truncate text-[11px] text-gray-500">{user.email}</span></span><form action={signOutAction}><button aria-label="Sign out" className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-red-600"><LogOut className="size-4" /></button></form></div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-md lg:bg-[#f3f4f6]/90">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"><Menu className="size-6" /></button>
            <div className="min-w-0 lg:hidden"><p className="truncate text-sm font-semibold">{current?.label ?? "Hineni"}</p></div>
            <form action="/search" className="hidden w-full max-w-xl items-center gap-3 rounded-lg border bg-white px-3 shadow-sm md:flex"><Search className="size-4 text-gray-400" /><input aria-label="Global search" name="q" className="h-10 w-full border-0 bg-transparent p-0 text-sm outline-none shadow-none" placeholder="Search tours, guests, enquiries..." /></form>
            <div className="ml-auto flex items-center gap-2"><Link href="/tours/new" className="flex h-10 items-center gap-2 rounded-lg bg-[#011478] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00105f]"><Plus className="size-4" /><span className="hidden sm:inline">New tour</span></Link><Link href="/notifications" aria-label="Notifications" className="grid size-10 place-items-center rounded-lg border bg-white text-gray-500 shadow-sm hover:text-[#011478]"><Bell className="size-[18px]" /></Link></div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ item, selected, compact = false }: { item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }; selected: boolean; compact?: boolean }) {
  const Icon = item.icon;
  return <Link href={item.href} className={cn("flex items-center rounded-lg text-sm transition", compact ? "min-h-9 gap-2 px-3" : "min-h-10 gap-3 px-3 font-medium", selected ? "bg-blue-50 font-semibold text-[#011478]" : "text-gray-700 hover:bg-blue-50 hover:text-[#011478]")}><Icon className={compact ? "size-4" : "size-5"} />{item.label}</Link>;
}
