import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { listQuotations } from "@/modules/quotations/queries/quotations";

export const metadata = { title: "Quotations" };
export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  const quotations = await listQuotations();
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">Commercial documents</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Quotations</h1>
      <p className="mt-3 text-sm text-[#68736e]">Versioned customer offers backed by preserved itinerary, pricing, cost, and exchange-rate evidence.</p>
      <section className="mt-7 overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="bg-[#f8f8f5] text-xs uppercase text-[#7b8580]"><tr><th className="px-6 py-3">Quotation</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Tour</th><th className="px-6 py-3">Version</th><th className="px-6 py-3">Total</th><th className="px-6 py-3">Status</th><th /></tr></thead><tbody className="divide-y">
          {quotations.map((quotation) => { const version = quotation.versions[0]; return <tr key={quotation.id}><td className="px-6 py-4 font-semibold">{quotation.reference}</td><td className="px-6 py-4">{quotation.customer.fullName}</td><td className="px-6 py-4">{quotation.tour.name}</td><td className="px-6 py-4">v{quotation.currentVersionNumber}</td><td className="px-6 py-4 font-semibold">{version ? formatMoney(version.total.toString(), version.currencyCode) : "—"}</td><td className="px-6 py-4"><span className="rounded-full bg-[#edf5f1] px-2.5 py-1 text-xs capitalize text-[#176b55]">{quotation.status.toLowerCase()}</span></td><td className="px-6 py-4"><Link href={`/quotations/${quotation.id}`}><ArrowRight className="size-4 text-[#176b55]" /></Link></td></tr>; })}
          {!quotations.length ? <tr><td colSpan={7} className="px-6 py-14 text-center"><FileCheck2 className="mx-auto size-6 text-[#a0a8a4]" /><p className="mt-3 text-sm text-[#7b8580]">No quotations generated yet.</p></td></tr> : null}
        </tbody></table></div>
      </section>
    </div>
  );
}
