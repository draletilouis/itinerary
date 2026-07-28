import Link from "next/link";
import { AlertTriangle, BellRing, CalendarClock, FileWarning, WalletCards } from "lucide-react";
import { prisma } from "@/server/db/prisma";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const now = new Date();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + 30);
  const [followUps, tasks, invoices, documents, drivers, guides, incidents] = await Promise.all([
    prisma.enquiryFollowUp.findMany({ where: { scheduledFor: { lt: now }, status: "PENDING" }, include: { enquiry: { select: { id: true, reference: true, customer: { select: { fullName: true } } } } }, orderBy: { scheduledFor: "asc" }, take: 50 }),
    prisma.operationalTask.findMany({ where: { dueDate: { lt: today }, status: { in: ["PENDING","IN_PROGRESS"] } }, include: { tour: { select: { reference: true, name: true } } }, orderBy: { dueDate: "asc" }, take: 50 }),
    prisma.invoice.findMany({ where: { dueDate: { lt: today }, balanceDue: { gt: 0 }, status: { in: ["ISSUED","PARTIALLY_PAID","OVERDUE"] } }, include: { customer: { select: { fullName: true } } }, orderBy: { dueDate: "asc" }, take: 50 }),
    prisma.attachment.findMany({ where: { expiresAt: { gte: today, lte: soon } }, orderBy: { expiresAt: "asc" }, take: 50 }),
    prisma.driver.findMany({ where: { licenceExpiry: { gte: today, lte: soon }, status: "ACTIVE" }, orderBy: { licenceExpiry: "asc" }, take: 50 }),
    prisma.guide.findMany({ where: { certificationExpiry: { gte: today, lte: soon }, status: "ACTIVE" }, orderBy: { certificationExpiry: "asc" }, take: 50 }),
    prisma.tourIncident.findMany({ where: { severity: { in: ["HIGH","CRITICAL"] }, status: { in: ["OPEN","INVESTIGATING"] } }, include: { tour: { select: { reference: true, name: true } } }, orderBy: { occurredAt: "desc" }, take: 50 }),
  ]);
  const total = followUps.length + tasks.length + invoices.length + documents.length + drivers.length + guides.length + incidents.length;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#176b55]">Attention centre</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-2 text-sm leading-6 text-[#68736e]">Live, database-derived alerts for overdue work, financial exposure, expiring records, and serious incidents.</p>
      <div className="mt-7 rounded-2xl border bg-white p-5"><div className="flex items-center gap-3"><BellRing className="size-5 text-[#176b55]" /><p className="font-semibold">{total} item{total === 1 ? "" : "s"} need attention</p></div></div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3"><h2 className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-[#176b55]" /> Overdue work</h2>
          {followUps.map((entry) => <Link key={entry.id} href={`/enquiries/${entry.enquiry.id}`} className="block rounded-2xl border bg-white p-4"><p className="text-sm font-semibold">Follow up · {entry.enquiry.reference}</p><p className="mt-1 text-xs text-[#7b8580]">{entry.enquiry.customer.fullName} · due {entry.scheduledFor.toLocaleString("en-UG")}</p></Link>)}
          {tasks.map((entry) => <Link key={entry.id} href="/operations" className="block rounded-2xl border bg-white p-4"><p className="text-sm font-semibold">Operational task · {entry.title}</p><p className="mt-1 text-xs text-[#7b8580]">{entry.tour.reference} · {entry.tour.name} · due {entry.dueDate?.toLocaleDateString("en-UG")}</p></Link>)}
        </div>
        <div className="space-y-3"><h2 className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-[#176b55]" /> Overdue receivables</h2>
          {invoices.map((invoice) => <Link key={invoice.id} href="/finance" className="block rounded-2xl border bg-white p-4"><p className="text-sm font-semibold">{invoice.reference} · {invoice.customer.fullName}</p><p className="mt-1 text-xs text-[#7b8580]">{invoice.currencyCode} {invoice.balanceDue.toString()} outstanding · due {invoice.dueDate.toLocaleDateString("en-UG")}</p></Link>)}
        </div>
        <div className="space-y-3"><h2 className="flex items-center gap-2 font-semibold"><FileWarning className="size-4 text-[#176b55]" /> Expiring documents and credentials</h2>
          {documents.map((entry) => <Link key={entry.id} href="/documents" className="block rounded-2xl border bg-white p-4"><p className="text-sm font-semibold">{entry.documentType} · {entry.fileName}</p><p className="mt-1 text-xs text-[#7b8580]">Expires {entry.expiresAt?.toLocaleDateString("en-UG")}</p></Link>)}
          {drivers.map((entry) => <Link key={entry.id} href="/resources" className="block rounded-2xl border bg-white p-4"><p className="text-sm font-semibold">Driver licence · {entry.fullName}</p><p className="mt-1 text-xs text-[#7b8580]">Expires {entry.licenceExpiry?.toLocaleDateString("en-UG")}</p></Link>)}
          {guides.map((entry) => <Link key={entry.id} href="/resources" className="block rounded-2xl border bg-white p-4"><p className="text-sm font-semibold">Guide certification · {entry.fullName}</p><p className="mt-1 text-xs text-[#7b8580]">Expires {entry.certificationExpiry?.toLocaleDateString("en-UG")}</p></Link>)}
        </div>
        <div className="space-y-3"><h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-red-700" /> Serious open incidents</h2>
          {incidents.map((incident) => <Link key={incident.id} href="/operations" className="block rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-sm font-semibold">{incident.reference} · {incident.title}</p><p className="mt-1 text-xs text-red-700">{incident.severity} · {incident.tour.reference} · {incident.tour.name}</p></Link>)}
        </div>
      </section>
      {!total ? <p className="mt-8 rounded-2xl border bg-white p-8 text-center text-sm text-[#7b8580]">Nothing currently needs attention.</p> : null}
    </div>
  );
}
