import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Download, Send, X } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import {
  acceptQuotationAction,
  declineQuotationAction,
  expireQuotationAction,
  reviseQuotationAction,
  sendQuotationAction,
} from "@/modules/quotations/actions/quotations";
import { getQuotation } from "@/modules/quotations/queries/quotations";
import { isQuotationExpired } from "@/modules/quotations/services/lifecycle";

export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";

export default async function QuotationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  const { version: requested } = await searchParams;
  const quotation = await getQuotation(id);
  if (!quotation) notFound();
  const version =
    quotation.versions.find((item) => item.versionNumber === Number(requested)) ??
    quotation.versions.find((item) => item.versionNumber === quotation.currentVersionNumber) ??
    quotation.versions[0];
  if (!version) notFound();
  const canRevise = !["ACCEPTED", "CANCELLED"].includes(quotation.status);
  const currentVersion = version.versionNumber === quotation.currentVersionNumber;
  const isPastValidity = currentVersion && isQuotationExpired(version.validUntil);

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/quotations" className="inline-flex items-center gap-2 text-sm text-[#68736e]"><ArrowLeft className="size-4" /> Back to quotations</Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex gap-3"><span className="rounded-full bg-[#edf5f1] px-2.5 py-1 text-xs font-semibold text-[#176b55]">{quotation.reference}</span><span className="rounded-full bg-[#f1f3ef] px-2.5 py-1 text-xs capitalize">{version.status.toLowerCase()}</span></div><h1 className="mt-3 text-3xl font-semibold tracking-tight">{version.title}</h1><p className="mt-2 text-sm text-[#68736e]">{quotation.customer.fullName} · {quotation.tour.name}</p></div>
        <div className="flex flex-wrap gap-2">{quotation.versions.map((item) => <Link key={item.id} href={`/quotations/${quotation.id}?version=${item.versionNumber}`} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${item.id === version.id ? "bg-[#176b55] text-white" : "bg-white"}`}>v{item.versionNumber}</Link>)}</div>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Quotation total",formatMoney(version.total.toString(),version.currencyCode)],["Valid until",version.validUntil.toLocaleDateString("en-UG")],["Estimated profit",formatMoney(version.estimatedProfit.toString(),version.currencyCode)],["Margin",`${version.estimatedMargin.toFixed(2)}%`]].map(([label,value]) => <article key={label} className="rounded-2xl border bg-white p-5"><p className="text-xs text-[#7b8580]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></article>)}
      </section>

      <section className="mt-6 flex flex-wrap gap-3 rounded-2xl border bg-white p-5">
        <a href={`/api/quotations/${quotation.id}/pdf?version=${version.versionNumber}`} className="flex h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold"><Download className="size-4" /> Download PDF</a>
        {quotation.tour.booking ? <Link href={`/bookings/${quotation.tour.booking.id}`} className="flex h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold"><Check className="size-4" /> Open booking</Link> : null}
        {currentVersion && quotation.status === "GENERATED" && !isPastValidity ? <form action={sendQuotationAction}><input type="hidden" name="quotationId" value={quotation.id} /><button className="flex h-11 items-center gap-2 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white"><Send className="size-4" /> Mark sent</button></form> : null}
        {currentVersion && ["GENERATED","SENT"].includes(quotation.status) && !isPastValidity ? <form action={acceptQuotationAction}><input type="hidden" name="quotationId" value={quotation.id} /><button className="flex h-11 items-center gap-2 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white"><Check className="size-4" /> Accept quotation</button></form> : null}
        {currentVersion && ["GENERATED","SENT"].includes(quotation.status) && !isPastValidity ? <form action={declineQuotationAction} className="flex gap-2"><input type="hidden" name="quotationId" value={quotation.id} /><input className="h-11 rounded-xl border px-3 text-sm" name="reason" required placeholder="Decline reason" /><button className="flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold text-red-700"><X className="size-4" /> Decline</button></form> : null}
        {currentVersion && ["GENERATED","SENT"].includes(quotation.status) && isPastValidity ? <form action={expireQuotationAction}><input type="hidden" name="quotationId" value={quotation.id} /><button className="flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold text-amber-700"><X className="size-4" /> Mark expired</button></form> : null}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b bg-[#123d32] px-7 py-7 text-white"><p className="text-xs uppercase tracking-[0.2em] text-[#eac58f]">Hineni Tour Operations</p><h2 className="mt-3 text-2xl font-semibold">{version.title}</h2><p className="mt-2 text-sm text-white/65">Prepared for {quotation.customer.fullName}</p></div>
          <div className="p-7">
            <div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-[#7b8580]">Reference:</span> {quotation.reference}-V{version.versionNumber}</p><p><span className="text-[#7b8580]">Valid until:</span> {version.validUntil.toLocaleDateString("en-UG")}</p><p><span className="text-[#7b8580]">Travel:</span> {quotation.tour.startDate.toLocaleDateString("en-UG")} – {quotation.tour.endDate.toLocaleDateString("en-UG")}</p><p><span className="text-[#7b8580]">Guests:</span> {quotation.tour.adults + quotation.tour.children}</p></div>
            <div className="mt-7 overflow-hidden rounded-xl border"><table className="w-full text-sm"><thead className="bg-[#f8f8f5] text-left text-xs uppercase text-[#7b8580]"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y">{version.lines.map((line) => <tr key={line.id}><td className="px-4 py-4"><p className="font-medium">{line.description}</p><p className="mt-1 text-xs text-[#7b8580]">{line.details}</p></td><td className="px-4 py-4 text-right font-semibold">{formatMoney(line.total.toString(),version.currencyCode)}</td></tr>)}</tbody><tfoot className="border-t bg-[#fafaf7]"><tr><td className="px-4 pt-4 text-right text-[#68736e]">Subtotal</td><td className="px-4 pt-4 text-right">{formatMoney(version.subtotal.toString(),version.currencyCode)}</td></tr><tr><td className="px-4 pt-2 text-right text-[#68736e]">Tax</td><td className="px-4 pt-2 text-right">{formatMoney(version.tax.toString(),version.currencyCode)}</td></tr><tr><td className="px-4 pt-2 text-right text-[#68736e]">Discount</td><td className="px-4 pt-2 text-right">− {formatMoney(version.discount.toString(),version.currencyCode)}</td></tr><tr><td className="px-4 py-4 text-right font-semibold">Total</td><td className="px-4 py-4 text-right text-lg font-semibold text-[#176b55]">{formatMoney(version.total.toString(),version.currencyCode)}</td></tr></tfoot></table></div>
            {version.itineraryVersion ? <div className="mt-8"><h3 className="font-semibold">Your itinerary</h3><div className="mt-4 space-y-5">{version.itineraryVersion.days.map((day) => <article key={day.id} className="border-l-2 border-[#dce4df] pl-4"><p className="text-xs font-semibold uppercase text-[#176b55]">Day {day.dayNumber} · {day.date?.toLocaleDateString("en-UG")}</p><h4 className="mt-1 font-semibold">{day.title}</h4><p className="mt-2 text-sm leading-6 text-[#59635e]">{day.clientNarrative}</p>{day.items.length ? <ul className="mt-2 space-y-1 text-xs text-[#68736e]">{day.items.map((item) => <li key={item.id}>{item.startTime ? `${item.startTime} · ` : ""}{item.title}</li>)}</ul> : null}</article>)}</div></div> : null}
            {version.customerNotes ? <div className="mt-7 rounded-xl bg-[#f8f8f5] p-4 text-sm leading-6">{version.customerNotes}</div> : null}
            {version.terms ? <div className="mt-7"><h3 className="text-sm font-semibold">Terms</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#68736e]">{version.terms}</p></div> : null}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Internal snapshot evidence</h2><p className="mt-2 text-xs leading-5 text-[#7b8580]">Never included in the customer PDF.</p><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-[#7b8580]">Cost items frozen</dt><dd className="font-semibold">{version.costSnapshots.length}</dd></div><div className="flex justify-between"><dt className="text-[#7b8580]">Exchange rates frozen</dt><dd className="font-semibold">{version.exchangeRateSnapshots.length}</dd></div><div className="flex justify-between"><dt className="text-[#7b8580]">Pricing revision</dt><dd className="font-semibold">#{version.pricing.revision}</dd></div><div className="flex justify-between"><dt className="text-[#7b8580]">Itinerary version</dt><dd className="font-semibold">v{version.itineraryVersion?.versionNumber ?? "—"}</dd></div></dl></section>
          {canRevise && version.versionNumber === quotation.currentVersionNumber ? <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Create revision</h2><p className="mt-1 text-xs text-[#7b8580]">The current version becomes superseded; its snapshots remain unchanged.</p><form action={reviseQuotationAction} className="mt-5 grid gap-4 sm:grid-cols-2"><input type="hidden" name="quotationId" value={quotation.id} />
            <label className="text-xs">Subtotal<input className={input} name="subtotal" required defaultValue={version.subtotal.toString()} /></label><label className="text-xs">Tax<input className={input} name="tax" required defaultValue={version.tax.toString()} /></label><label className="text-xs">Discount<input className={input} name="discount" required defaultValue={version.discount.toString()} /></label><label className="text-xs">Valid until<input className={input} name="validUntil" type="date" required defaultValue={version.validUntil.toISOString().slice(0,10)} /></label>
            <label className="text-xs sm:col-span-2">Revision reason<input className={input} name="revisionReason" required /></label><label className="text-xs sm:col-span-2">Below-minimum reason<input className={input} name="belowMinimumReason" /></label><label className="text-xs sm:col-span-2">Customer notes<textarea className="mt-2 min-h-20 w-full rounded-xl border p-3 text-sm" name="customerNotes" defaultValue={version.customerNotes ?? ""} /></label><label className="text-xs sm:col-span-2">Terms<textarea className="mt-2 min-h-20 w-full rounded-xl border p-3 text-sm" name="terms" defaultValue={version.terms ?? ""} /></label><div className="sm:col-span-2"><button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Create revision</button></div>
          </form></section> : null}
        </div>
      </div>
    </div>
  );
}
