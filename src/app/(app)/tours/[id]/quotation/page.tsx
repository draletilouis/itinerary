import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileCheck2 } from "lucide-react";
import { TourWorkspaceNav } from "@/components/tour-workspace-nav";
import { formatMoney } from "@/lib/utils";
import { generateQuotationAction } from "@/modules/quotations/actions/quotations";
import { getTourQuotationWorkspace } from "@/modules/quotations/queries/quotations";

export const dynamic = "force-dynamic";

export default async function TourQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tour = await getTourQuotationWorkspace(id);
  if (!tour) notFound();
  const pricing = tour.pricingSnapshots[0];
  const itinerary = tour.itineraries.flatMap((item) => item.versions)[0];
  const defaultValidity = new Date();
  defaultValidity.setDate(defaultValidity.getDate() + 14);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/tours/${tour.id}`} className="inline-flex items-center gap-2 text-sm text-[#4b5563]"><ArrowLeft className="size-4" /> Back to {tour.reference}</Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#011478]">Customer offer</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Quotation workspace</h1>
      <p className="mt-3 text-sm text-[#4b5563]">{tour.name} · {tour.customer.fullName}</p>

      <TourWorkspaceNav tourId={tour.id} active="quotation" itineraryId={tour.itineraries[0]?.id} bookingId={tour.booking?.id} />

      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border bg-white p-5"><p className="text-xs text-[#6b7280]">Latest saved pricing</p><p className="mt-2 text-xl font-semibold">{pricing ? formatMoney(pricing.sellingPrice.toString(), pricing.currencyCode) : "Not ready"}</p><p className="mt-2 text-xs text-[#6b7280]">{pricing ? `Revision ${pricing.revision} · ${pricing.estimatedMargin.toFixed(2)}% margin` : "Save pricing first."}</p></article>
        <article className="rounded-xl border bg-white p-5"><p className="text-xs text-[#6b7280]">Published itinerary</p><p className="mt-2 text-xl font-semibold">{itinerary?.title ?? "Not ready"}</p><p className="mt-2 text-xs text-[#6b7280]">{itinerary ? `Version ${itinerary.versionNumber}` : "Publish an itinerary first."}</p></article>
      </section>

      <section className="mt-6 rounded-xl border bg-white p-5">
        <div className="flex items-center gap-3"><FileCheck2 className="size-5 text-[#011478]" /><div><h2 className="font-semibold">Generate quotation</h2><p className="text-xs text-[#6b7280]">Pricing, cost items, exchange rates, and itinerary version will be frozen.</p></div></div>
        <form action={generateQuotationAction} className="mt-5 grid gap-4 sm:grid-cols-2"><input type="hidden" name="tourId" value={tour.id} />
          <label className="text-sm font-medium">Valid until<input className="mt-2 h-11 w-full rounded-lg border px-3" name="validUntil" type="date" required defaultValue={defaultValidity.toISOString().slice(0,10)} /></label>
          <label className="text-sm font-medium">Quotation view<select className="mt-2 h-11 w-full rounded-lg border bg-white px-3" name="presentationMode" defaultValue="BOTH"><option value="BOTH">Itinerary items + per traveller</option><option value="ITEMIZED">Itinerary items only</option><option value="PER_TRAVELLER">Per traveller only</option></select></label>
          <div className="rounded-lg border bg-[#f9fafb] p-4 sm:col-span-2"><p className="text-sm font-semibold">Per-traveller pricing (optional)</p><p className="mt-1 text-xs leading-5 text-[#4b5563]">Leave these blank to divide {pricing ? formatMoney(pricing.sellingPrice.toString(), pricing.currencyCode) : "the quotation total"} automatically across {tour.adults} adult{tour.adults === 1 ? "" : "s"}{tour.children ? ` and ${tour.children} child${tour.children === 1 ? "" : "ren"}` : ""}. Enter custom rates only when adult and child prices differ.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{tour.adults > 0 ? <label className="text-xs font-medium">Price per adult<input className="mt-2 h-10 w-full rounded-lg border bg-white px-3" name="adultUnitPrice" inputMode="decimal" placeholder="Auto" /></label> : null}{tour.children > 0 ? <label className="text-xs font-medium">Price per child<input className="mt-2 h-10 w-full rounded-lg border bg-white px-3" name="childUnitPrice" inputMode="decimal" placeholder="Auto" /></label> : null}</div></div>
          <label className="text-sm font-medium sm:col-span-2">Customer notes<textarea className="mt-2 min-h-24 w-full rounded-lg border p-3 text-sm" name="customerNotes" /></label>
          <label className="text-sm font-medium sm:col-span-2">Terms<textarea className="mt-2 min-h-24 w-full rounded-lg border p-3 text-sm" name="terms" defaultValue={itinerary?.terms ?? ""} /></label>
          <div className="sm:col-span-2"><button disabled={!pricing || !itinerary} className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white disabled:opacity-50">Generate immutable quotation</button></div>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Tour quotations</h2></div><div className="divide-y">{tour.quotations.map((quotation) => { const version = quotation.versions[0]; return <Link key={quotation.id} href={`/quotations/${quotation.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f9fafb]"><div className="flex-1"><p className="text-sm font-semibold">{quotation.reference}</p><p className="mt-1 text-xs capitalize text-[#6b7280]">v{quotation.currentVersionNumber} · {quotation.status.toLowerCase()}</p></div><p className="text-sm font-semibold">{version ? formatMoney(version.total.toString(), version.currencyCode) : "—"}</p><ArrowRight className="size-4 text-[#011478]" /></Link>; })}{!tour.quotations.length ? <p className="px-5 py-8 text-center text-sm text-[#6b7280]">No quotations for this tour.</p> : null}</div></section>
    </div>
  );
}
