import type { EnquiryStatus } from "@prisma/client";
import Link from "next/link";
import { CalendarClock, LayoutList, Plus, Search, SquareKanban } from "lucide-react";
import { getPipeline, listEnquiries } from "@/modules/enquiries/queries/enquiries";

export const metadata = { title: "Leads & Enquiries" };
export const dynamic = "force-dynamic";

const columns: { status: EnquiryStatus; label: string }[] = [
  { status: "NEW", label: "New" },
  { status: "CONTACTED", label: "Contacted" },
  { status: "QUALIFYING", label: "Qualifying" },
  { status: "PLANNING", label: "Planning" },
  { status: "QUOTATION_SENT", label: "Quotation sent" },
  { status: "NEGOTIATION", label: "Negotiation" },
];

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; status?: string }>;
}) {
  const { view = "pipeline", q = "", status } = await searchParams;
  const validStatus = columns
    .map((column) => column.status)
    .concat(["CONFIRMED", "LOST", "CANCELLED"])
    .includes(status as EnquiryStatus)
    ? (status as EnquiryStatus)
    : undefined;
  const enquiries =
    view === "list"
      ? await listEnquiries({ search: q, status: validStatus })
      : await getPipeline();

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#011478]">
            Sales pipeline
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Leads & Enquiries</h1>
          <p className="mt-3 text-sm text-[#4b5563]">
            Follow each request from first contact through planning and confirmation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/customers" className="flex h-11 items-center rounded-lg border bg-white px-4 text-sm font-semibold">Customers</Link>
          <Link href="/enquiries/new" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white">
            <Plus className="size-4" /> New enquiry
          </Link>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-fit rounded-lg border bg-white p-1">
          <Link
            href="/enquiries?view=pipeline"
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
              view !== "list" ? "bg-[#eff3ff] text-[#011478]" : "text-[#4b5563]"
            }`}
          >
            <SquareKanban className="size-4" /> Pipeline
          </Link>
          <Link
            href="/enquiries?view=list"
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
              view === "list" ? "bg-[#eff3ff] text-[#011478]" : "text-[#4b5563]"
            }`}
          >
            <LayoutList className="size-4" /> List
          </Link>
        </div>
        {view === "list" ? (
          <form className="flex flex-wrap gap-3">
            <input type="hidden" name="view" value="list" />
            <span className="flex h-11 min-w-72 items-center gap-2 rounded-lg border bg-white px-3">
              <Search className="size-4 text-[#6b7280]" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                name="q"
                defaultValue={q}
                placeholder="Search enquiries"
              />
            </span>
            <select
              className="h-11 rounded-lg border bg-white px-3 text-sm"
              name="status"
              defaultValue={status ?? ""}
            >
              <option value="">All statuses</option>
              {[...columns, { status: "CONFIRMED" as const, label: "Confirmed" }, { status: "LOST" as const, label: "Lost" }, { status: "CANCELLED" as const, label: "Cancelled" }].map(
                (option) => <option key={option.status} value={option.status}>{option.label}</option>,
              )}
            </select>
            <button className="h-11 rounded-lg border bg-white px-4 text-sm font-semibold">Apply</button>
          </form>
        ) : null}
      </div>

      {view === "list" ? (
        <section className="mt-5 overflow-hidden rounded-xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Travel dates</th>
                  <th className="px-6 py-3 font-medium">Guests</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Follow-up</th>
                  <th className="px-6 py-3 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="hover:bg-[#f9fafb]">
                    <td className="px-6 py-4 font-semibold">
                      <Link href={`/enquiries/${enquiry.id}`}>{enquiry.reference}</Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{enquiry.customer.fullName}</p>
                      <p className="mt-1 text-xs text-[#6b7280]">{enquiry.customer.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-[#4b5563]">
                      {enquiry.proposedStartDate?.toLocaleDateString("en-UG") ?? "Flexible"}
                    </td>
                    <td className="px-6 py-4">{enquiry.adults + enquiry.children}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs capitalize text-[#011478]">
                        {enquiry.status.toLowerCase().replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#4b5563]">
                      {enquiry.followUpAt?.toLocaleString("en-UG") ?? "Not scheduled"}
                    </td>
                    <td className="px-6 py-4 text-[#4b5563]">
                      {enquiry.assignedTo?.fullName ?? "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mt-5 grid gap-4 overflow-x-auto pb-3 xl:grid-cols-6">
          {columns.map((column) => {
            const items = enquiries.filter((enquiry) => enquiry.status === column.status);
            return (
              <div key={column.status} className="min-w-[270px] rounded-xl bg-[#ebece7] p-3 xl:min-w-0">
                <div className="flex items-center justify-between px-1 py-2">
                  <h2 className="text-sm font-semibold">{column.label}</h2>
                  <span className="grid size-6 place-items-center rounded-full bg-white text-xs">{items.length}</span>
                </div>
                <div className="mt-2 space-y-3">
                  {items.map((enquiry) => (
                    <Link
                      key={enquiry.id}
                      href={`/enquiries/${enquiry.id}`}
                      className="block rounded-lg border bg-white p-4 shadow-sm hover:border-[#bfdbfe]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#011478]">{enquiry.reference}</span>
                        <span className="text-[11px] text-[#9ca3af]">
                          {enquiry.createdAt.toLocaleDateString("en-UG")}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold">{enquiry.customer.fullName}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#4b5563]">
                        {enquiry.destinationsOfInterest.join(", ") || "Destination not set"}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-[11px] text-[#6b7280]">
                        <CalendarClock className="size-3.5" />
                        {enquiry.followUpAt
                          ? enquiry.followUpAt.toLocaleDateString("en-UG")
                          : "No follow-up"}
                      </div>
                    </Link>
                  ))}
                  {!items.length ? (
                    <p className="rounded-lg border border-dashed border-[#ced2cb] px-3 py-7 text-center text-xs text-[#9ca3af]">
                      No enquiries
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
