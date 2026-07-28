import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calculator, Coins, Trash2, TrendingUp } from "lucide-react";
import { TourWorkspaceNav } from "@/components/tour-workspace-nav";
import { archiveTourCostItemAction } from "@/modules/costing/actions/cost-items";
import { addTourCostItemAction, saveTourPricingAction } from "@/modules/costing/actions/tour-costing";
import { getTourCosting } from "@/modules/costing/queries/tour-costing";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";

export default async function TourCostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getTourCosting(id);
  if (!data.tour) notFound();
  const tour = data.tour;
  const latest = tour.pricingSnapshots[0];

  return (
    <div className="mx-auto max-w-7xl">
      <Link href={`/tours/${tour.id}`} className="inline-flex items-center gap-2 text-sm text-[#68736e]"><ArrowLeft className="size-4" /> Back to {tour.reference}</Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">Multi-currency worksheet</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{tour.name} costing</h1>
      <p className="mt-3 text-sm text-[#68736e]">Original supplier currency is preserved; every item records the exact conversion rate used.</p>

      <TourWorkspaceNav tourId={tour.id} active="costing" itineraryId={tour.itineraries[0]?.id} bookingId={tour.booking?.id} />

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border bg-white p-5"><Coins className="size-5 text-[#176b55]" /><p className="mt-4 text-xs text-[#7b8580]">Internal cost</p><p className="mt-2 text-2xl font-semibold">{formatMoney(tour.estimatedInternalCost.toString(), tour.costingCurrencyCode)}</p></article>
        <article className="rounded-2xl border bg-white p-5"><Calculator className="size-5 text-[#176b55]" /><p className="mt-4 text-xs text-[#7b8580]">Customer price</p><p className="mt-2 text-2xl font-semibold">{formatMoney(tour.sellingPrice.toString(), tour.quotationCurrencyCode)}</p></article>
        <article className="rounded-2xl border bg-white p-5"><TrendingUp className="size-5 text-[#176b55]" /><p className="mt-4 text-xs text-[#7b8580]">Estimated margin</p><p className="mt-2 text-2xl font-semibold">{tour.estimatedMargin.toFixed(2)}%</p></article>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Cost items</h2><p className="mt-1 text-xs text-[#7b8580]">{tour.costItems.length} recorded items</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead className="bg-[#f8f8f5] text-xs uppercase text-[#7b8580]"><tr><th className="px-5 py-3">Item</th><th className="px-5 py-3">Basis</th><th className="px-5 py-3">Original</th><th className="px-5 py-3">Rate</th><th className="px-5 py-3">Converted</th><th className="px-5 py-3">Supplier</th><th className="px-5 py-3">Control</th></tr></thead><tbody className="divide-y">{tour.costItems.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-medium">{item.description}</p><p className="mt-1 text-xs text-[#7b8580]">{item.category}</p></td><td className="px-5 py-4 capitalize">{item.basis.toLowerCase().replaceAll("_"," ")}</td><td className="px-5 py-4">{formatMoney(item.originalTotal.toString(), item.originalCurrencyCode)}</td><td className="px-5 py-4">{item.exchangeRate.toString()}<p className="text-[11px] text-[#8b948f]">{item.exchangeRateDate.toLocaleDateString("en-UG")}</p></td><td className="px-5 py-4 font-semibold">{formatMoney(item.convertedTotal.toString(), item.convertedCurrencyCode)}</td><td className="px-5 py-4 text-[#68736e]">{item.supplier?.name ?? "Direct"}</td><td className="px-5 py-4"><details><summary className="cursor-pointer text-xs font-semibold text-red-700">Remove</summary><form action={archiveTourCostItemAction} className="mt-2 flex min-w-64 gap-2"><input type="hidden" name="tourId" value={tour.id} /><input type="hidden" name="costItemId" value={item.id} /><input className="h-9 flex-1 rounded-lg border px-2 text-xs" name="reason" required placeholder="Correction reason" /><button aria-label={`Remove ${item.description}`} className="grid size-9 place-items-center rounded-lg border text-red-700"><Trash2 className="size-4" /></button></form></details></td></tr>)}{!tour.costItems.length ? <tr><td colSpan={7} className="px-5 py-10 text-center text-[#7b8580]">No cost items yet.</td></tr> : null}</tbody></table></div>
        <details className="border-t bg-[#fafaf7]"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[#176b55]">Add cost item</summary><form action={addTourCostItemAction} className="grid gap-4 border-t p-5 sm:grid-cols-2 lg:grid-cols-4"><input type="hidden" name="tourId" value={tour.id} />
          <label className="text-xs">Category<select className={input} name="category">{["Accommodation","Activities","Transport","Meals","Permits","Guides","Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs sm:col-span-2">Description<input className={input} name="description" required /></label>
          <label className="text-xs">Calculation basis<select className={input} name="basis">{["STANDARD","ACCOMMODATION","PER_PERSON","VEHICLE","OVERRIDE"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Unit cost<input className={input} name="unitCost" required inputMode="decimal" /></label>
          {["quantity","days","nights","rooms","vehicles","eligibleTravellers","taxPercentage","commissionPercentage"].map((name) => <label key={name} className="text-xs capitalize">{name.replace(/([A-Z])/g," $1")}<input className={input} name={name} inputMode="decimal" /></label>)}
          <label className="text-xs">Override total<input className={input} name="overrideTotal" /></label><label className="text-xs">Override reason<input className={input} name="overrideReason" /></label>
          <label className="text-xs">Original currency<select className={input} name="originalCurrencyCode" defaultValue={tour.costingCurrencyCode}>{data.currencies.map((item) => <option key={item.code}>{item.code}</option>)}</select></label>
          <label className="text-xs">Rate date<input className={input} name="exchangeRateDate" type="date" required defaultValue={new Date().toISOString().slice(0,10)} /></label>
          <label className="text-xs">Supplier<select className={input} name="supplierId"><option value="">Direct</option>{data.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs">Itinerary day<select className={input} name="itineraryDayId"><option value="">Not linked</option>{data.itineraryDays.map((item) => <option key={item.id} value={item.id}>Day {item.dayNumber} · {item.title}</option>)}</select></label>
          <div className="sm:col-span-2 lg:col-span-4"><button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Add cost item</button></div>
        </form></details>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">Tour pricing</h2><p className="mt-1 text-xs text-[#7b8580]">Each save creates an immutable pricing revision. A minimum margin applies only to this tour.</p>
        <form action={saveTourPricingAction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><input type="hidden" name="tourId" value={tour.id} />
          <label className="text-xs">Contingency method<select className={input} name="contingencyMethod">{["NONE","PERCENTAGE","FIXED","PER_PERSON","PER_DAY"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Contingency value<input className={input} name="contingencyValue" /></label>
          <label className="text-xs">Markup method<select className={input} name="markupMethod">{["PERCENTAGE","FIXED","PER_PERSON","TARGET_PRICE","TARGET_MARGIN"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Markup or target value<input className={input} name="markupValue" required /></label>
          <label className="text-xs">Tax method<select className={input} name="taxMethod">{["NONE","PERCENTAGE","FIXED"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Tax value<input className={input} name="taxValue" /></label>
          <label className="text-xs">Discount method<select className={input} name="discountMethod">{["NONE","PERCENTAGE","FIXED","PER_PERSON"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs">Discount value<input className={input} name="discountValue" /></label>
          <label className="text-xs">Minimum margin %<input className={input} name="minimumMargin" defaultValue={tour.marginSetting?.minimumMargin?.toString() ?? ""} /></label>
          <label className="text-xs lg:col-span-2">Below-minimum reason<input className={input} name="belowMinimumReason" placeholder="Required only when calculated margin is below the selected minimum" /></label>
          <div className="lg:col-span-4"><button disabled={!tour.costItems.length} className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white disabled:opacity-50">Save pricing revision</button></div>
        </form>
        {latest ? <div className="mt-6 grid gap-3 rounded-xl bg-[#f8f8f5] p-4 sm:grid-cols-4"><div><p className="text-xs text-[#7b8580]">Revision</p><p className="mt-1 font-semibold">#{latest.revision}</p></div><div><p className="text-xs text-[#7b8580]">Selling price</p><p className="mt-1 font-semibold">{formatMoney(latest.sellingPrice.toString(), latest.currencyCode)}</p></div><div><p className="text-xs text-[#7b8580]">Profit</p><p className="mt-1 font-semibold">{formatMoney(latest.estimatedProfit.toString(), latest.currencyCode)}</p></div><div><p className="text-xs text-[#7b8580]">Margin</p><p className="mt-1 font-semibold">{latest.estimatedMargin.toFixed(2)}%</p></div></div> : null}
      </section>
    </div>
  );
}
