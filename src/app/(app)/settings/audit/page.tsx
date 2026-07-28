import { History, ShieldCheck } from "lucide-react";
import { prisma } from "@/server/db/prisma";

export const metadata = { title: "Audit history" };
export const dynamic = "force-dynamic";

export default async function AuditHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; action?: string }>;
}) {
  const filters = await searchParams;
  const entityType = filters.entityType?.trim() ?? "";
  const action = filters.action?.trim() ?? "";
  const events = await prisma.auditEvent.findMany({
    where: {
      entityType: entityType || undefined,
      action: action ? { contains: action, mode: "insensitive" } : undefined,
    },
    include: { actor: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  const entityTypes = await prisma.auditEvent.findMany({
    distinct: ["entityType"],
    select: { entityType: true },
    orderBy: { entityType: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#176b55]">
        Governance
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit history</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68736e]">
        Immutable server-written evidence for important commercial, financial,
        resource, operational, authentication, and configuration changes.
      </p>

      <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-[220px_1fr_auto]">
        <select className="h-10 rounded-xl border px-3 text-sm" name="entityType" defaultValue={entityType}>
          <option value="">All entity types</option>
          {entityTypes.map((entry) => <option key={entry.entityType}>{entry.entityType}</option>)}
        </select>
        <input className="h-10 rounded-xl border px-3 text-sm" name="action" defaultValue={action} placeholder="Filter action, for example resource.assignment" />
        <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Apply filters</button>
      </form>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center gap-3 border-b px-5 py-4"><History className="size-5 text-[#176b55]" /><div><h2 className="font-semibold">Latest events</h2><p className="text-xs text-[#7b8580]">Up to 250 matching records</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-[#f8f8f5] text-xs uppercase text-[#7b8580]"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Entity</th><th className="px-5 py-3">Evidence</th></tr></thead><tbody className="divide-y">{events.map((event) => <tr key={event.id}><td className="px-5 py-4 whitespace-nowrap">{event.createdAt.toLocaleString("en-UG")}</td><td className="px-5 py-4"><p className="font-semibold">{event.actor.fullName}</p><p className="text-xs text-[#7b8580]">{event.actor.email}</p></td><td className="px-5 py-4 font-mono text-xs">{event.action}</td><td className="px-5 py-4"><p>{event.entityType}</p><p className="font-mono text-[11px] text-[#7b8580]">{event.entityId}</p></td><td className="max-w-md px-5 py-4"><details><summary className="cursor-pointer text-xs font-semibold text-[#176b55]">View values</summary><pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#f8f8f5] p-3 text-[11px] leading-4">{JSON.stringify({ previous: event.previousValues, next: event.newValues, reason: event.reason }, null, 2)}</pre></details></td></tr>)}{!events.length ? <tr><td colSpan={5} className="px-5 py-10 text-center text-[#7b8580]">No matching audit events.</td></tr> : null}</tbody></table></div>
      </section>

      <p className="mt-6 flex items-center gap-2 text-xs text-[#7b8580]">
        <ShieldCheck className="size-4 text-[#176b55]" />
        Audit history has no edit or delete workflow.
      </p>
    </div>
  );
}
