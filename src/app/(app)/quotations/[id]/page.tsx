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
import { getTravellerPricingRows } from "@/modules/quotations/services/presentation";

export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm";

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
  const showItemized = version.presentationMode !== "PER_TRAVELLER";
  const showPerTraveller = version.presentationMode !== "ITEMIZED";
  const travellerRows = getTravellerPricingRows({
      total: version.total,
    adults: quotation.tour.adults,
    children: quotation.tour.children,
    adultUnitPrice: version.adultUnitPrice,
    childUnitPrice: version.childUnitPrice,
    adjustment: version.travellerAdjustment,
  });

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/quotations" className="inline-flex items-center gap-2 text-sm text-[#4b5563]"><ArrowLeft className="size-4" /> Back to quotations</Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex gap-3"><span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs font-semibold text-[#011478]">{quotation.reference}</span><span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs capitalize">{version.status.toLowerCase()}</span></div><h1 className="mt-3 text-3xl font-semibold tracking-tight">{version.title}</h1><p className="mt-2 text-sm text-[#4b5563]">{quotation.customer.fullName} · {quotation.tour.name}</p></div>
        <div className="flex flex-wrap gap-2">{quotation.versions.map((item) => <Link key={item.id} href={`/quotations/${quotation.id}?version=${item.versionNumber}`} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${item.id === version.id ? "bg-[#011478] text-white" : "bg-white"}`}>v{item.versionNumber}</Link>)}</div>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Quotation total",formatMoney(version.total.toString(),version.currencyCode)],["Valid until",version.validUntil.toLocaleDateString("en-UG")],["Estimated profit",formatMoney(version.estimatedProfit.toString(),version.currencyCode)],["Margin",`${version.estimatedMargin.toFixed(2)}%`]].map(([label,value]) => <article key={label} className="rounded-xl border bg-white p-5"><p className="text-xs text-[#6b7280]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></article>)}
      </section>

      <section className="mt-6 flex flex-wrap gap-3 rounded-xl border bg-white p-5">
        <a href={`/api/quotations/${quotation.id}/pdf?version=${version.versionNumber}`} className="flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold"><Download className="size-4" /> Download PDF</a>
        {quotation.tour.booking ? <Link href={`/bookings/${quotation.tour.booking.id}`} className="flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold"><Check className="size-4" /> Open booking</Link> : null}
        {currentVersion && quotation.status === "GENERATED" && !isPastValidity ? <form action={sendQuotationAction}><input type="hidden" name="quotationId" value={quotation.id} /><button className="flex h-11 items-center gap-2 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white"><Send className="size-4" /> Mark sent</button></form> : null}
        {currentVersion && ["GENERATED","SENT"].includes(quotation.status) && !isPastValidity ? <form action={acceptQuotationAction}><input type="hidden" name="quotationId" value={quotation.id} /><button className="flex h-11 items-center gap-2 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white"><Check className="size-4" /> Accept quotation</button></form> : null}
        {currentVersion && ["GENERATED","SENT"].includes(quotation.status) && !isPastValidity ? <form action={declineQuotationAction} className="flex gap-2"><input type="hidden" name="quotationId" value={quotation.id} /><input className="h-11 rounded-lg border px-3 text-sm" name="reason" required placeholder="Decline reason" /><button className="flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold text-red-700"><X className="size-4" /> Decline</button></form> : null}
        {currentVersion && ["GENERATED","SENT"].includes(quotation.status) && isPastValidity ? <form action={expireQuotationAction}><input type="hidden" name="quotationId" value={quotation.id} /><button className="flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold text-amber-700"><X className="size-4" /> Mark expired</button></form> : null}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b bg-[#111827] px-7 py-7 text-white"><p className="text-xs uppercase tracking-[0.2em] text-[#67bfff]">Hineni Tour Operations</p><h2 className="mt-3 text-2xl font-semibold">{version.title}</h2><p className="mt-2 text-sm text-white/65">Prepared for {quotation.customer.fullName}</p></div>
          <div className="p-7">
            <div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-[#6b7280]">Reference:</span> {quotation.reference}-V{version.versionNumber}</p><p><span className="text-[#6b7280]">Valid until:</span> {version.validUntil.toLocaleDateString("en-UG")}</p><p><span className="text-[#6b7280]">Travel:</span> {quotation.tour.startDate.toLocaleDateString("en-UG")} – {quotation.tour.endDate.toLocaleDateString("en-UG")}</p><p><span className="text-[#6b7280]">Guests:</span> {quotation.tour.adults + quotation.tour.children}</p></div>
            {showItemized ? <div className="mt-7 overflow-hidden rounded-lg border"><div className="border-b bg-[#f9fafb] px-4 py-3"><h3 className="text-sm font-semibold">Price by itinerary item</h3><p className="mt-1 text-xs text-[#6b7280]">Customer selling prices only. Included items have no separate charge.</p></div><table className="w-full text-sm"><thead className="bg-[#f9fafb] text-left text-xs uppercase text-[#6b7280]"><tr><th className="px-4 py-3">Itinerary item</th><th className="px-4 py-3 text-right">Selling price</th></tr></thead><tbody className="divide-y">{version.lines.map((line) => <tr key={line.id}><td className="px-4 py-4"><p className="font-medium">{line.description}</p><p className="mt-1 text-xs text-[#6b7280]">{line.details}</p></td><td className="px-4 py-4 text-right font-semibold">{line.total.isZero() ? <span className="text-[#4b5563]">Included</span> : formatMoney(line.total.toString(),version.currencyCode)}</td></tr>)}</tbody></table></div> : null}
            {showPerTraveller ? <div className="mt-5 overflow-hidden rounded-lg border"><div className="border-b bg-[#f9fafb] px-4 py-3"><h3 className="text-sm font-semibold">Price per traveller</h3><p className="mt-1 text-xs text-[#6b7280]">A clear group view that reconciles to the same quotation total.</p></div><div className="divide-y">{travellerRows.map((row) => <div key={row.type} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 text-sm"><div><p className="font-medium">{row.label}</p><p className="mt-1 text-xs text-[#6b7280]">{row.quantity} × {formatMoney(row.unitPrice.toString(), version.currencyCode)}{row.adjustment.isZero() ? "" : ` · ${formatMoney(row.adjustment.toString(), version.currencyCode)} rounding balance`}</p></div><p className="font-semibold">{formatMoney(row.total.toString(), version.currencyCode)}</p></div>)}</div></div> : null}
            <div className="mt-5 flex items-center justify-between rounded-lg bg-[#eff3ff] px-4 py-4"><span className="font-semibold">Quotation total</span><span className="text-lg font-semibold text-[#011478]">{formatMoney(version.total.toString(),version.currencyCode)}</span></div>            {version.itineraryVersion ? <div className="mt-8"><h3 className="font-semibold">Your itinerary</h3><div className="mt-4 space-y-5">{version.itineraryVersion.days.map((day) => <article key={day.id} className="border-l-2 border-[#e5e7eb] pl-4"><p className="text-xs font-semibold uppercase text-[#011478]">Day {day.dayNumber} · {day.date?.toLocaleDateString("en-UG")}</p><h4 className="mt-1 font-semibold">{day.title}</h4><p className="mt-2 text-sm leading-6 text-[#4b5563]">{day.clientNarrative}</p>{day.items.length ? <ul className="mt-2 space-y-1 text-xs text-[#4b5563]">{day.items.map((item) => <li key={item.id}>{item.startTime ? `${item.startTime} · ` : ""}{item.title}</li>)}</ul> : null}</article>)}</div></div> : null}
            {version.customerNotes ? <div className="mt-7 rounded-lg bg-[#f9fafb] p-4 text-sm leading-6">{version.customerNotes}</div> : null}
            {version.terms ? <div className="mt-7"><h3 className="text-sm font-semibold">Terms</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#4b5563]">{version.terms}</p></div> : null}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Internal snapshot evidence</h2><p className="mt-2 text-xs leading-5 text-[#6b7280]">Never included in the customer PDF.</p><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-[#6b7280]">Cost items frozen</dt><dd className="font-semibold">{version.costSnapshots.length}</dd></div><div className="flex justify-between"><dt className="text-[#6b7280]">Exchange rates frozen</dt><dd className="font-semibold">{version.exchangeRateSnapshots.length}</dd></div><div className="flex justify-between"><dt className="text-[#6b7280]">Pricing revision</dt><dd className="font-semibold">#{version.pricing.revision}</dd></div><div className="flex justify-between"><dt className="text-[#6b7280]">Itinerary version</dt><dd className="font-semibold">v{version.itineraryVersion?.versionNumber ?? "—"}</dd></div></dl></section>
          {canRevise && version.versionNumber === quotation.currentVersionNumber ? <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Create revision</h2><p className="mt-1 text-xs text-[#6b7280]">The current version becomes superseded; its snapshots remain unchanged.</p><form action={reviseQuotationAction} className="mt-5 grid gap-4 sm:grid-cols-2"><input type="hidden" name="quotationId" value={quotation.id} />
            <label className="text-xs">Subtotal<input className={input} name="subtotal" required defaultValue={version.subtotal.toString()} /></label><label className="text-xs">Tax<input className={input} name="tax" required defaultValue={version.tax.toString()} /></label><label className="text-xs">Discount<input className={input} name="discount" required defaultValue={version.discount.toString()} /></label><label className="text-xs">Valid until<input className={input} name="validUntil" type="date" required defaultValue={version.validUntil.toISOString().slice(0,10)} /></label>
            <label className="text-xs sm:col-span-2">Quotation view<select className={input} name="presentationMode" defaultValue={version.presentationMode}><option value="BOTH">Itinerary items + per traveller</option><option value="ITEMIZED">Itinerary items only</option><option value="PER_TRAVELLER">Per traveller only</option></select></label><div className="rounded-lg border bg-[#f9fafb] p-3 text-xs sm:col-span-2"><p className="font-semibold">Optional custom traveller prices</p><p className="mt-1 leading-5 text-[#6b7280]">Leave blank to balance the revised total automatically.</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{quotation.tour.adults > 0 ? <input className={input} name="adultUnitPrice" inputMode="decimal" placeholder={`Adult price (current ${version.adultUnitPrice?.toFixed(2) ?? "auto"})`} /> : null}{quotation.tour.children > 0 ? <input className={input} name="childUnitPrice" inputMode="decimal" placeholder={`Child price (current ${version.childUnitPrice?.toFixed(2) ?? "auto"})`} /> : null}</div></div>
            <label className="text-xs sm:col-span-2">Revision reason<input className={input} name="revisionReason" required /></label><label className="text-xs sm:col-span-2">Below-minimum reason<input className={input} name="belowMinimumReason" /></label><label className="text-xs sm:col-span-2">Customer notes<textarea className="mt-2 min-h-20 w-full rounded-lg border p-3 text-sm" name="customerNotes" defaultValue={version.customerNotes ?? ""} /></label><label className="text-xs sm:col-span-2">Terms<textarea className="mt-2 min-h-20 w-full rounded-lg border p-3 text-sm" name="terms" defaultValue={version.terms ?? ""} /></label><div className="sm:col-span-2"><button className="h-10 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white">Create revision</button></div>
          </form></section> : null}
        </div>
      </div>
    </div>
  );
}
