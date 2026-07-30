import Link from "next/link";
import { ArrowRight, MapPinned, PackageOpen, Plus, Search } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { listTours } from "@/modules/tours/queries/tours";

export const metadata = { title: "Tours" };
export const dynamic = "force-dynamic";

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const tours = await listTours(q);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#011478]">Central tour records</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tours</h1>
          <p className="mt-3 text-sm text-[#4b5563]">Planning, pricing, booking, operations, payments, and profitability stay connected here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/packages" className="flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold"><PackageOpen className="size-4" /> Standard packages</Link>
          <Link href="/tours/new" className="flex h-11 items-center gap-2 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white"><Plus className="size-4" /> Create new tour</Link>
        </div>
      </div>

      <form className="mt-7 flex max-w-xl items-center gap-3 rounded-lg border bg-white px-4">
        <Search className="size-4 text-[#6b7280]" />
        <input className="h-12 flex-1 bg-transparent text-sm outline-none" name="q" defaultValue={q} placeholder="Search tours, customers, or references" />
      </form>

      <section className="mt-5 overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
              <tr>
                <th className="px-6 py-3 font-medium">Tour</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Dates</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Selling price</th>
                <th className="px-6 py-3 font-medium">Estimated profit</th>
                <th className="px-6 py-3 font-medium">Owner</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tours.map((tour) => (
                <tr key={tour.id} className="hover:bg-[#f9fafb]">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{tour.name}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">{tour.reference}</p>
                  </td>
                  <td className="px-6 py-4">{tour.customer.fullName}</td>
                  <td className="px-6 py-4 text-[#4b5563]">
                    {tour.startDate.toLocaleDateString("en-UG")} – {tour.endDate.toLocaleDateString("en-UG")}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs capitalize text-[#011478]">
                      {tour.status.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">{formatMoney(tour.sellingPrice.toString(), tour.quotationCurrencyCode)}</td>
                  <td className="px-6 py-4">{formatMoney(tour.estimatedProfit.toString(), tour.quotationCurrencyCode)}</td>
                  <td className="px-6 py-4 text-[#4b5563]">{tour.owner.fullName}</td>
                  <td className="px-6 py-4">
                    <Link href={`/tours/${tour.id}`}><ArrowRight className="size-4 text-[#011478]" /></Link>
                  </td>
                </tr>
              ))}
              {!tours.length ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <MapPinned className="mx-auto size-6 text-[#9ca3af]" />
                    <p className="mt-3 font-medium">No tours yet</p>
                    <p className="mt-1 text-xs text-[#6b7280]">Create one directly, from an enquiry, or from a standard package.</p>
                    <Link href="/tours/new" className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white">Create first tour</Link>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
