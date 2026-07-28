import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CircleDollarSign,
  FileCheck2,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { TourWorkspaceNav } from "@/components/tour-workspace-nav";
import { formatMoney } from "@/lib/utils";
import {
  assignBookingTravellerAction,
  cancelBookingAction,
  confirmBookingAction,
  removeBookingTravellerAction,
  updateBookingScheduleAction,
} from "@/modules/bookings/actions/bookings";
import { getBooking } from "@/modules/bookings/queries/bookings";
import { issueScheduleInvoiceAction } from "@/modules/finance/actions/finance";

export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  const assignedIds = new Set(booking.travellers.map((item) => item.travellerId));
  const availableTravellers = booking.customer.travellers.filter(
    (traveller) => !assignedIds.has(traveller.id),
  );
  const deposit = booking.paymentSchedule.find((entry) => entry.label === "Deposit");
  const instalments = booking.paymentSchedule.filter(
    (entry) => entry.label !== "Deposit" && entry.label !== "Final balance",
  );
  const canEditSchedule =
    ["PROVISIONAL", "AWAITING_DEPOSIT"].includes(booking.status) &&
    booking.amountPaid.isZero();
  const canManageTravellers = !["COMPLETED", "CANCELLED", "REFUNDED"].includes(
    booking.status,
  );
  const canConfirm =
    ["PROVISIONAL", "AWAITING_DEPOSIT"].includes(booking.status) &&
    booking.amountPaid.greaterThanOrEqualTo(booking.depositAmount);
  const canCancel = !["COMPLETED", "CANCELLED", "REFUNDED"].includes(booking.status);

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-[#68736e]">
        <ArrowLeft className="size-4" /> Back to bookings
      </Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-[#edf5f1] px-2.5 py-1 text-xs font-semibold text-[#176b55]">
              {booking.reference}
            </span>
            <span className="rounded-full bg-[#f1f3ef] px-2.5 py-1 text-xs capitalize">
              {booking.status.toLowerCase().replaceAll("_", " ")}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{booking.tour.name}</h1>
          <p className="mt-2 text-sm text-[#68736e]">
            {booking.customer.fullName} · booked{" "}
            {booking.bookingDate.toLocaleDateString("en-UG")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/tours/${booking.tourId}`}
            className="flex h-11 items-center rounded-xl border bg-white px-4 text-sm font-semibold"
          >
            Open tour
          </Link>
          <Link
            href={`/quotations/${booking.acceptedQuotationVersion.quotation.id}?version=${booking.acceptedQuotationVersion.versionNumber}`}
            className="flex h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold"
          >
            <FileCheck2 className="size-4" /> Accepted quotation
          </Link>
          {canConfirm ? (
            <form action={confirmBookingAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button className="flex h-11 items-center gap-2 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">
                <Check className="size-4" /> Confirm booking
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <TourWorkspaceNav tourId={booking.tourId} active="booking" itineraryId={booking.acceptedItineraryVersion?.itinerary.id} bookingId={booking.id} />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            CircleDollarSign,
            "Accepted total",
            formatMoney(booking.totalAmount.toString(), booking.currencyCode),
          ],
          [
            CalendarClock,
            "Deposit required",
            formatMoney(booking.depositAmount.toString(), booking.currencyCode),
          ],
          [
            CircleDollarSign,
            "Amount paid",
            formatMoney(booking.amountPaid.toString(), booking.currencyCode),
          ],
          [
            CircleDollarSign,
            "Balance due",
            formatMoney(booking.balanceDue.toString(), booking.currencyCode),
          ],
        ].map(([Icon, label, value]) => {
          const CardIcon = Icon as typeof CircleDollarSign;
          return (
            <article key={String(label)} className="rounded-2xl border bg-white p-5">
              <CardIcon className="size-5 text-[#176b55]" />
              <p className="mt-4 text-xs text-[#7b8580]">{String(label)}</p>
              <p className="mt-2 text-xl font-semibold">{String(value)}</p>
            </article>
          );
        })}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="font-semibold">Payment schedule</h2>
                <p className="mt-1 text-xs text-[#7b8580]">
                  Milestones always add up to the accepted quotation total.
                </p>
              </div>
              <CalendarClock className="size-5 text-[#176b55]" />
            </div>
            <div className="divide-y">
              {booking.paymentSchedule.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2 px-6 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8"
                >
                  <div>
                    <p className="text-sm font-medium">{entry.label}</p>
                    <p className="mt-1 text-xs text-[#7b8580]">
                      Due {entry.dueDate.toLocaleDateString("en-UG")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatMoney(entry.amount.toString(), booking.currencyCode)}
                  </p>
                  {entry.invoice ? (
                    <a href={`/api/invoices/${entry.invoice.id}/pdf`} className="text-xs font-semibold text-[#176b55]">
                      {entry.invoice.reference}
                    </a>
                  ) : booking.status !== "CANCELLED" ? (
                    <form action={issueScheduleInvoiceAction}>
                      <input type="hidden" name="scheduleId" value={entry.id} />
                      <button className="rounded-lg border px-3 py-2 text-xs font-semibold">Issue invoice</button>
                    </form>
                  ) : (
                    <span className="text-xs capitalize text-[#68736e]">{entry.status.toLowerCase()}</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {canEditSchedule ? (
            <details className="rounded-2xl border bg-white">
              <summary className="cursor-pointer px-6 py-5 text-sm font-semibold">
                Configure deposit and instalments
              </summary>
              <form
                action={updateBookingScheduleAction}
                className="grid gap-4 border-t p-6 sm:grid-cols-2"
              >
                <input type="hidden" name="bookingId" value={booking.id} />
                <label className="text-xs">
                  Deposit amount
                  <input
                    className={input}
                    name="depositAmount"
                    required
                    defaultValue={booking.depositAmount.toString()}
                  />
                </label>
                <label className="text-xs">
                  Deposit due date
                  <input
                    className={input}
                    name="depositDueDate"
                    type="date"
                    defaultValue={deposit?.dueDate.toISOString().slice(0, 10) ?? ""}
                  />
                </label>
                {[0, 1].map((index) => (
                  <div key={index} className="contents">
                    <label className="text-xs">
                      Instalment {index + 2} amount
                      <input
                        className={input}
                        name={`instalment${index + 1}Amount`}
                        defaultValue={instalments[index]?.amount.toString() ?? ""}
                      />
                    </label>
                    <label className="text-xs">
                      Instalment {index + 2} due date
                      <input
                        className={input}
                        name={`instalment${index + 1}DueDate`}
                        type="date"
                        defaultValue={
                          instalments[index]?.dueDate.toISOString().slice(0, 10) ?? ""
                        }
                      />
                    </label>
                  </div>
                ))}
                <label className="text-xs sm:col-span-2">
                  Final payment date
                  <input
                    className={input}
                    name="finalPaymentDate"
                    type="date"
                    required
                    defaultValue={
                      booking.finalPaymentDate?.toISOString().slice(0, 10) ??
                      booking.tour.startDate.toISOString().slice(0, 10)
                    }
                  />
                </label>
                <div className="sm:col-span-2">
                  <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">
                    Save payment schedule
                  </button>
                </div>
              </form>
            </details>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">Travellers</h2>
                <p className="mt-1 text-xs text-[#7b8580]">
                  {booking.travellers.length}/{booking.travellerCount} profiles assigned
                </p>
              </div>
              <Users className="size-5 text-[#176b55]" />
            </div>
            <div className="divide-y">
              {booking.travellers.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {item.traveller.fullName}
                      {item.isLead ? (
                        <span className="ml-2 rounded-full bg-[#edf5f1] px-2 py-0.5 text-[10px] text-[#176b55]">
                          Lead
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-[#7b8580]">
                      {[item.traveller.relationship, item.traveller.nationality]
                        .filter(Boolean)
                        .join(" · ") || "Guest profile"}
                    </p>
                  </div>
                  {canManageTravellers ? (
                    <form action={removeBookingTravellerAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <input type="hidden" name="linkId" value={item.id} />
                      <button aria-label={`Remove ${item.traveller.fullName}`} className="p-2 text-red-700">
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
              {!booking.travellers.length ? (
                <p className="px-5 py-8 text-center text-sm text-[#7b8580]">
                  No traveller profiles assigned yet.
                </p>
              ) : null}
            </div>
            {canManageTravellers ? (
              <form action={assignBookingTravellerAction} className="space-y-4 border-t bg-[#fafaf7] p-5">
                <input type="hidden" name="bookingId" value={booking.id} />
                <label className="block text-xs">
                  Customer traveller
                  <select className={input} name="travellerId" required defaultValue="">
                    <option value="" disabled>
                      Select traveller
                    </option>
                    {availableTravellers.map((traveller) => (
                      <option key={traveller.id} value={traveller.id}>
                        {traveller.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input name="isLead" type="checkbox" /> Lead traveller
                </label>
                <label className="block text-xs">
                  Booking note
                  <input className={input} name="notes" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={!availableTravellers.length}
                    className="flex h-10 items-center gap-2 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <UserRoundPlus className="size-4" /> Assign traveller
                  </button>
                  <Link
                    href={`/customers/${booking.customerId}`}
                    className="flex h-10 items-center rounded-xl border bg-white px-4 text-sm font-semibold"
                  >
                    Manage profiles
                  </Link>
                </div>
              </form>
            ) : null}
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Frozen booking basis</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#7b8580]">Quotation</dt>
                <dd className="font-semibold">
                  {booking.acceptedQuotationVersion.quotation.reference}-V
                  {booking.acceptedQuotationVersion.versionNumber}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#7b8580]">Itinerary</dt>
                <dd className="text-right font-semibold">
                  {booking.acceptedItineraryVersion
                    ? `${booking.acceptedItineraryVersion.itinerary.reference}-V${booking.acceptedItineraryVersion.versionNumber}`
                    : "Not linked"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#7b8580]">Created by</dt>
                <dd className="font-semibold">{booking.createdBy.fullName}</dd>
              </div>
            </dl>
          </section>

          {canCancel ? (
            <details className="rounded-2xl border border-red-200 bg-white">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-red-700">
                Cancel booking
              </summary>
              <form action={cancelBookingAction} className="border-t border-red-100 p-5">
                <input type="hidden" name="bookingId" value={booking.id} />
                <label className="text-xs">
                  Cancellation reason
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-xl border p-3 text-sm"
                    name="reason"
                    required
                  />
                </label>
                <button className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700">
                  <X className="size-4" /> Confirm cancellation
                </button>
              </form>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
