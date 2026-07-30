import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Route,
  Users,
} from "lucide-react";
import {
  addCommunicationAction,
  completeFollowUpAction,
  convertEnquiryToTourAction,
  duplicateEnquiryAction,
  scheduleFollowUpAction,
  setEnquiryStatusAction,
} from "@/modules/enquiries/actions/enquiries";
import {
  getEnquiry,
  getEnquiryFormOptions,
} from "@/modules/enquiries/queries/enquiries";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";
const textareaClass =
  "mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [enquiry, options] = await Promise.all([
    getEnquiry(id),
    getEnquiryFormOptions(),
  ]);
  if (!enquiry) notFound();

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/enquiries" className="inline-flex items-center gap-2 text-sm text-[#4b5563]">
        <ArrowLeft className="size-4" /> Back to enquiries
      </Link>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs font-semibold text-[#011478]">
              {enquiry.reference}
            </span>
            <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs capitalize text-[#4b5563]">
              {enquiry.status.toLowerCase().replaceAll("_", " ")}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {enquiry.customer.fullName}
          </h1>
          <p className="mt-2 text-sm text-[#4b5563]">
            Received via {enquiry.source} on {enquiry.dateReceived.toLocaleDateString("en-UG")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={duplicateEnquiryAction}>
            <input type="hidden" name="enquiryId" value={enquiry.id} />
            <button className="flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold">
              <Copy className="size-4" /> Duplicate
            </button>
          </form>
          <Link
            href={`/customers/${enquiry.customer.id}`}
            className="grid h-11 place-items-center rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white"
          >
            Open customer
          </Link>
        </div>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Phone, "Phone", enquiry.customer.phone ?? "Not provided"],
          [Mail, "Email", enquiry.customer.email ?? "Not provided"],
          [Users, "Guests", `${enquiry.adults} adults · ${enquiry.children} children`],
          [
            MapPin,
            "Destinations",
            enquiry.destinationsOfInterest.join(", ") || "Not selected",
          ],
        ].map(([Icon, label, value]) => {
          const CardIcon = Icon as typeof Phone;
          return (
            <article key={String(label)} className="rounded-xl border bg-white p-5">
              <CardIcon className="size-4 text-[#011478]" />
              <p className="mt-4 text-xs text-[#6b7280]">{String(label)}</p>
              <p className="mt-1 truncate text-sm font-semibold">{String(value)}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Move enquiry</h2>
        <form action={setEnquiryStatusAction} className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr_auto]">
          <input type="hidden" name="enquiryId" value={enquiry.id} />
          <select className="h-11 rounded-lg border px-3 text-sm" name="status" defaultValue={enquiry.status}>
            {[
              "NEW",
              "CONTACTED",
              "QUALIFYING",
              "PLANNING",
              "QUOTATION_SENT",
              "NEGOTIATION",
              "CONFIRMED",
              "LOST",
              "CANCELLED",
            ].map((status) => (
              <option key={status} value={status}>
                {status.toLowerCase().replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-lg border px-3 text-sm"
            name="reason"
            placeholder="Reason required for lost or cancelled"
          />
          <button className="h-11 rounded-lg border bg-[#f9fafb] px-4 text-sm font-semibold">
            Update status
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border bg-white">
            <div className="flex items-center gap-3 border-b px-6 py-5">
              <MessageSquareText className="size-5 text-[#011478]" />
              <div>
                <h2 className="font-semibold">Communication timeline</h2>
                <p className="mt-1 text-xs text-[#6b7280]">Calls, messages, email, and notes</p>
              </div>
            </div>
            <div className="divide-y">
              {enquiry.communications.map((communication) => (
                <article key={communication.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold">
                        {communication.channel}
                      </span>
                      <span className="text-[11px] capitalize text-[#6b7280]">
                        {communication.direction.toLowerCase()}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9ca3af]">
                      {communication.occurredAt.toLocaleString("en-UG")}
                    </span>
                  </div>
                  {communication.subject ? (
                    <p className="mt-3 text-sm font-semibold">{communication.subject}</p>
                  ) : null}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4b5563]">
                    {communication.content}
                  </p>
                  <p className="mt-3 text-[11px] text-[#9ca3af]">
                    Added by {communication.createdBy.fullName}
                  </p>
                </article>
              ))}
              {!enquiry.communications.length ? (
                <p className="px-6 py-10 text-center text-sm text-[#6b7280]">
                  No communication recorded yet.
                </p>
              ) : null}
            </div>
            <details className="border-t bg-[#f9fafb]">
              <summary className="cursor-pointer px-6 py-4 text-sm font-semibold">Add communication</summary>
              <form action={addCommunicationAction} className="grid gap-4 border-t p-6 sm:grid-cols-2">
                <input type="hidden" name="enquiryId" value={enquiry.id} />
                <label>
                  <span className="text-sm font-medium">Channel</span>
                  <select className={inputClass} name="channel" defaultValue="Phone">
                    {["Phone", "Email", "WhatsApp", "Meeting", "Note"].map((channel) => <option key={channel}>{channel}</option>)}
                  </select>
                </label>
                <label>
                  <span className="text-sm font-medium">Direction</span>
                  <select className={inputClass} name="direction" defaultValue="OUTBOUND">
                    <option value="OUTBOUND">Outbound</option>
                    <option value="INBOUND">Inbound</option>
                  </select>
                </label>
                <label>
                  <span className="text-sm font-medium">Date and time</span>
                  <input className={inputClass} name="occurredAt" type="datetime-local" />
                </label>
                <label>
                  <span className="text-sm font-medium">Subject</span>
                  <input className={inputClass} name="subject" />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">Details</span>
                  <textarea className={textareaClass} name="content" required />
                </label>
                <div className="sm:col-span-2">
                  <button className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">
                    Add to timeline
                  </button>
                </div>
              </form>
            </details>
          </section>

          <section className="overflow-hidden rounded-xl border bg-white">
            <div className="flex items-center gap-3 border-b px-6 py-5">
              <CalendarClock className="size-5 text-[#011478]" />
              <div>
                <h2 className="font-semibold">Follow-ups</h2>
                <p className="mt-1 text-xs text-[#6b7280]">Scheduled actions and outcomes</p>
              </div>
            </div>
            <div className="divide-y">
              {enquiry.followUps.map((followUp) => (
                <article key={followUp.id} className="px-6 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {followUp.scheduledFor.toLocaleString("en-UG")}
                      </p>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {followUp.notes ?? "No notes"} · {followUp.assignedTo?.fullName ?? "Unassigned"}
                      </p>
                      {followUp.outcome ? (
                        <p className="mt-2 text-xs text-[#4b5563]">Outcome: {followUp.outcome}</p>
                      ) : null}
                    </div>
                    {followUp.status === "PENDING" ? (
                      <form action={completeFollowUpAction} className="flex gap-2">
                        <input type="hidden" name="followUpId" value={followUp.id} />
                        <input type="hidden" name="enquiryId" value={enquiry.id} />
                        <input className="h-9 rounded-lg border px-3 text-xs" name="outcome" placeholder="Outcome" />
                        <button aria-label="Complete follow-up" className="grid size-9 place-items-center rounded-lg bg-[#eff3ff] text-[#011478]">
                          <Check className="size-4" />
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs font-semibold capitalize text-[#011478]">
                        {followUp.status.toLowerCase()}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <details className="border-t bg-[#f9fafb]">
              <summary className="cursor-pointer px-6 py-4 text-sm font-semibold">Schedule follow-up</summary>
              <form action={scheduleFollowUpAction} className="grid gap-4 border-t p-6 sm:grid-cols-2">
                <input type="hidden" name="enquiryId" value={enquiry.id} />
                <label>
                  <span className="text-sm font-medium">Date and time</span>
                  <input className={inputClass} name="scheduledFor" type="datetime-local" required />
                </label>
                <label>
                  <span className="text-sm font-medium">Assigned to</span>
                  <select className={inputClass} name="assignedToId" defaultValue={enquiry.assignedTo?.id ?? ""}>
                    <option value="">Current user</option>
                    {options.users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium">Notes</span>
                  <input className={inputClass} name="notes" />
                </label>
                <div className="sm:col-span-2">
                  <button className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">Schedule</button>
                </div>
              </form>
            </details>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold">Request details</h2>
            <dl className="mt-5 space-y-4 text-sm">
              {[
                ["Travel dates", enquiry.proposedStartDate ? `${enquiry.proposedStartDate.toLocaleDateString("en-UG")} – ${enquiry.proposedEndDate?.toLocaleDateString("en-UG") ?? "open"}` : "Not set"],
                ["Flexible dates", enquiry.flexibleDates ? "Yes" : "No"],
                ["Rooms", enquiry.rooms?.toString() ?? "Not set"],
                ["Budget", enquiry.customerBudget ? formatMoney(enquiry.customerBudget.toString(), enquiry.budgetCurrencyCode ?? "USD") : "Not set"],
                ["Accommodation", enquiry.accommodationPreference ?? "Not set"],
                ["Activities", enquiry.activityInterests.join(", ") || "Not set"],
                ["Transport", enquiry.transportPreference ?? "Not set"],
                ["Special requests", enquiry.specialRequests ?? "None"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[130px_1fr] gap-3">
                  <dt className="text-[#6b7280]">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border bg-white p-6">
            <div className="flex items-center gap-3">
              <Route className="size-5 text-[#011478]" />
              <div>
                <h2 className="font-semibold">Create tour</h2>
                <p className="mt-1 text-xs text-[#6b7280]">Carry this enquiry into tour planning</p>
              </div>
            </div>
            {enquiry.tours.length ? (
              <div className="mt-5 space-y-3">
                {enquiry.tours.map((tour) => (
                  <Link key={tour.id} href={`/tours/${tour.id}`} className="block rounded-lg border p-4 hover:bg-[#f9fafb]">
                    <p className="text-sm font-semibold">{tour.name}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">{tour.reference} · {tour.status.toLowerCase().replaceAll("_", " ")}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <form action={convertEnquiryToTourAction} className="mt-5 space-y-4">
                <input type="hidden" name="enquiryId" value={enquiry.id} />
                <label className="block">
                  <span className="text-sm font-medium">Tour name</span>
                  <input className={inputClass} name="name" required defaultValue={`${enquiry.customer.fullName} Tour`} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Tour type</span>
                  <select className={inputClass} name="type" defaultValue="CUSTOM">
                    {["CUSTOM", "STANDARD_PACKAGE", "GROUP_DEPARTURE", "PRIVATE", "CORPORATE", "SCHOOL", "DAY", "MULTI_DAY"].map(
                      (type) => <option key={type} value={type}>{type.toLowerCase().replaceAll("_", " ")}</option>,
                    )}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-medium">Start date</span>
                    <input className={inputClass} name="startDate" type="date" required defaultValue={enquiry.proposedStartDate?.toISOString().slice(0, 10)} />
                  </label>
                  <label>
                    <span className="text-sm font-medium">End date</span>
                    <input className={inputClass} name="endDate" type="date" required defaultValue={enquiry.proposedEndDate?.toISOString().slice(0, 10)} />
                  </label>
                  <label>
                    <span className="text-sm font-medium">Costing currency</span>
                    <select className={inputClass} name="costingCurrencyCode" defaultValue="USD">
                      {options.currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-medium">Quotation currency</span>
                    <select className={inputClass} name="quotationCurrencyCode" defaultValue={enquiry.budgetCurrencyCode ?? "USD"}>
                      {options.currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}
                    </select>
                  </label>
                </div>
                <button className="h-11 w-full rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">
                  Create tour
                </button>
              </form>
            )}
          </section>

          <section className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold">Status history</h2>
            <div className="mt-5 space-y-4">
              {enquiry.statusHistory.map((event) => (
                <div key={event.id} className="relative border-l-2 border-[#e5e7eb] pl-4">
                  <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-[#011478]" />
                  <p className="text-sm font-medium capitalize">
                    {event.toStatus.toLowerCase().replaceAll("_", " ")}
                  </p>
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
    </div>
  );
}
