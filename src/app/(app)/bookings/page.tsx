import Link from "next/link";
import { ArrowRight, CalendarCheck2, Search } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { listBookings } from "@/modules/bookings/queries/bookings";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const bookings = await listBookings(q);

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#011478]">
        Confirmed business
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bookings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b5563]">
        Accepted quotation values, guests, payment milestones, and booking status remain
        connected to the tour.
      </p>

      <form className="mt-6 flex max-w-lg items-center gap-3 rounded-lg border bg-white px-4">
        <Search className="size-4 text-[#6b7280]" />
        <input
          className="h-11 w-full bg-transparent text-sm outline-none"
          name="q"
          defaultValue={q}
          placeholder="Search booking, tour, or customer"
        />
      </form>

      <section className="mt-6 overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs uppercase text-[#6b7280]">
              <tr>
                <th className="px-6 py-3">Booking</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Tour</th>
                <th className="px-6 py-3">Travel</th>
                <th className="px-6 py-3">Guests</th>
                <th className="px-6 py-3">Balance</th>
                <th className="px-6 py-3">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 font-semibold">{booking.reference}</td>
                  <td className="px-6 py-4">{booking.customer.fullName}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{booking.tour.name}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">{booking.tour.reference}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-[#4b5563]">
                    {booking.tour.startDate.toLocaleDateString("en-UG")} –{" "}
                    {booking.tour.endDate.toLocaleDateString("en-UG")}
                  </td>
                  <td className="px-6 py-4">
                    {booking._count.travellers}/{booking.travellerCount}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {formatMoney(booking.balanceDue.toString(), booking.currencyCode)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs capitalize text-[#011478]">
                      {booking.status.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/bookings/${booking.id}`} aria-label={`Open ${booking.reference}`}>
                      <ArrowRight className="size-4 text-[#011478]" />
                    </Link>
                  </td>
                </tr>
              ))}
              {!bookings.length ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <CalendarCheck2 className="mx-auto size-7 text-[#9ca3af]" />
                    <p className="mt-3 text-sm text-[#6b7280]">
                      Accepted quotations will create bookings here.
                    </p>
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
