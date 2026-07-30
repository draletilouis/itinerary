import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  CircleDollarSign,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { TourWorkspaceNav } from "@/components/tour-workspace-nav";
import { setTourStatusAction } from "@/modules/tours/actions/tours";
import { getTour } from "@/modules/tours/queries/tours";

export const dynamic = "force-dynamic";

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tour = await getTour(id);
  if (!tour) notFound();

  const duration =
    Math.round((tour.endDate.getTime() - tour.startDate.getTime()) / 86_400_000) + 1;
  const itinerary = tour.itineraries[0];
  const itineraryVersion = itinerary?.versions[0];
  const latestQuotation = tour.quotations[0];
  const activeCostCount = tour.costItems.filter((item) => !item.archivedAt).length;
  const latestPricing = tour.pricingSnapshots[0];
  const pricingNeedsReview =
    !latestPricing ||
    Boolean(
      tour.costItems[0] &&
        tour.costItems[0].updatedAt.getTime() > latestPricing.createdAt.getTime(),
    );
  const nextStep =
    !itinerary
      ? { label: "Create itinerary", detail: "Add the guest experience and daily plan.", href: `/itineraries/new?tourId=${tour.id}` }
      : itineraryVersion?.status !== "PUBLISHED"
        ? { label: "Complete and publish itinerary", detail: "Review every day before customer pricing.", href: `/itineraries/${itinerary.id}` }
        : !activeCostCount
          ? { label: "Add tour costs", detail: "Record accommodation, activities, guides, transport, and other costs.", href: `/tours/${tour.id}/costing` }
          : pricingNeedsReview
            ? { label: "Set customer price", detail: "Choose contingency, markup, tax, discount, and margin.", href: `/tours/${tour.id}/costing` }
            : !latestQuotation
              ? { label: "Generate quotation", detail: "Freeze the itinerary, pricing, costs, and exchange rates.", href: `/tours/${tour.id}/quotation` }
              : !tour.booking
                ? { label: "Complete quotation decision", detail: `${latestQuotation.reference} is ${latestQuotation.status.toLowerCase().replaceAll("_", " ")}.`, href: `/quotations/${latestQuotation.id}` }
                : ["PROVISIONAL", "AWAITING_DEPOSIT"].includes(tour.booking.status)
                  ? { label: "Prepare and confirm booking", detail: "Set the payment schedule, issue the deposit invoice, and assign travellers.", href: `/bookings/${tour.booking.id}` }
                  : { label: "Prepare tour operations", detail: "Confirm suppliers, resources, tasks, and readiness.", href: `/operations?tourId=${tour.id}` };

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/tours" className="inline-flex items-center gap-2 text-sm text-[#4b5563]">
        <ArrowLeft className="size-4" /> Back to tours
      </Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs font-semibold text-[#011478]">{tour.reference}</span>
            <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs capitalize text-[#4b5563]">{tour.status.toLowerCase().replaceAll("_", " ")}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{tour.name}</h1>
          <p className="mt-2 text-sm text-[#4b5563]">
            {tour.customer.fullName} · owned by {tour.owner.fullName}
          </p>
        </div>
        {tour.sourceEnquiry ? (
          <Link href={`/enquiries/${tour.sourceEnquiry.id}`} className="text-sm font-semibold text-[#011478]">
            Source enquiry {tour.sourceEnquiry.reference}
          </Link>
        ) : null}
        {tour.sourcePackage ? (
          <Link href={`/packages/${tour.sourcePackage.id}`} className="text-sm font-semibold text-[#011478]">
            Package {tour.sourcePackage.reference} · revision {tour.sourcePackageRevision}
          </Link>
        ) : null}
      </div>

      <TourWorkspaceNav tourId={tour.id} active="overview" itineraryId={itinerary?.id} bookingId={tour.booking?.id} />

      <section className="mt-6 flex flex-col gap-4 rounded-xl border border-[#bfdbfe] bg-[#eff3ff] p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#011478]">Recommended next step</p><h2 className="mt-2 text-lg font-semibold">{nextStep.label}</h2><p className="mt-1 text-sm text-[#4b5563]">{nextStep.detail}</p></div>
        <Link href={nextStep.href} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">Continue <ArrowRight className="size-4" /></Link>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [CalendarRange, "Dates", `${tour.startDate.toLocaleDateString("en-UG")} – ${tour.endDate.toLocaleDateString("en-UG")}`],
          [MapPin, "Duration", `${duration} days · ${Math.max(duration - 1, 0)} nights`],
          [Users, "Guests", `${tour.adults} adults · ${tour.children} children`],
          [CircleDollarSign, "Selling price", formatMoney(tour.sellingPrice.toString(), tour.quotationCurrencyCode)],
        ].map(([Icon, label, value]) => {
          const CardIcon = Icon as typeof MapPin;
          return (
            <article key={String(label)} className="rounded-xl border bg-white p-5">
              <CardIcon className="size-4 text-[#011478]" />
              <p className="mt-4 text-xs text-[#6b7280]">{String(label)}</p>
              <p className="mt-1 truncate text-sm font-semibold">{String(value)}</p>
            </article>
          );
        })}
      </section>

      <details className="mt-6 rounded-xl border bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Advanced status control</summary>
        <form action={setTourStatusAction} className="grid gap-3 border-t p-5 sm:grid-cols-[240px_1fr_auto]">
          <input type="hidden" name="tourId" value={tour.id} />
          <select className="h-11 rounded-lg border px-3 text-sm capitalize" name="status" defaultValue={tour.status}>
            {["DRAFT", "PLANNING", "COSTING", "QUOTED", "AWAITING_CONFIRMATION", "CONFIRMED", "OPERATIONAL_PREPARATION", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ARCHIVED"].map(
              (status) => <option key={status} value={status}>{status.toLowerCase().replaceAll("_", " ")}</option>,
            )}
          </select>
          <input className="h-11 rounded-lg border px-3 text-sm" name="reason" placeholder="Reason required for cancellation" />
          <button className="h-11 rounded-lg border bg-[#f9fafb] px-4 text-sm font-semibold">Update</button>
        </form>
      </details>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-5 text-[#011478]" />
            <div>
              <h2 className="font-semibold">Financial overview</h2>
              <p className="mt-1 text-xs text-[#6b7280]">Estimated and actual tour performance</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Estimated internal cost", formatMoney(tour.estimatedInternalCost.toString(), tour.costingCurrencyCode)],
              ["Estimated profit", formatMoney(tour.estimatedProfit.toString(), tour.quotationCurrencyCode)],
              ["Estimated margin", `${tour.estimatedMargin.toFixed(2)}%`],
              ["Actual cost", formatMoney(tour.actualCost.toString(), tour.costingCurrencyCode)],
              ["Actual revenue", formatMoney(tour.actualRevenue.toString(), tour.costingCurrencyCode)],
              ["Actual profit", formatMoney(tour.actualProfit.toString(), tour.costingCurrencyCode)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#f9fafb] p-4">
                <p className="text-xs text-[#6b7280]">{label}</p>
                <p className="mt-2 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-lg border border-dashed px-4 py-3 text-xs leading-5 text-[#6b7280]">
            Recorded customer allocations and tour expenses update actual revenue, cost, profit, and margin in the tour costing currency.
          </p>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Status history</h2>
          <div className="mt-5 space-y-4">
            {tour.statusHistory.map((event) => (
              <div key={event.id} className="relative border-l-2 border-[#e5e7eb] pl-4">
                <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-[#011478]" />
                <p className="text-sm font-medium capitalize">{event.toStatus.toLowerCase().replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-[#6b7280]">
                  {event.createdAt.toLocaleString("en-UG")} · {event.changedBy.fullName}
                </p>
                {event.reason ? <p className="mt-1 text-xs text-[#4b5563]">{event.reason}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
