import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarRange,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  UserRoundPlus,
} from "lucide-react";
import { addTravellerAction } from "@/modules/customers/actions/customers";
import { getCustomer } from "@/modules/customers/queries/customers";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-[#4b5563]">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs font-semibold text-[#011478]">
              {customer.reference}
            </span>
            <span className="text-xs capitalize text-[#6b7280]">
              {customer.type.toLowerCase().replaceAll("_", " ")}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{customer.fullName}</h1>
          {customer.organisation ? (
            <p className="mt-2 text-sm text-[#4b5563]">{customer.organisation}</p>
          ) : null}
        </div>
        <Link
          href={`/enquiries/new?customerId=${customer.id}`}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white"
        >
          <Plus className="size-4" /> New enquiry
        </Link>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Phone, "Phone", customer.phone ?? "Not provided"],
          [Mail, "Email", customer.email ?? "Not provided"],
          [MessageSquareText, "Preferred contact", customer.preferredCommunicationMethod ?? "Not set"],
          [CalendarRange, "Tours", String(customer.tours.length)],
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 className="font-semibold">Travellers</h2>
              <p className="mt-1 text-xs text-[#6b7280]">
                Guest profiles linked to this customer
              </p>
            </div>
            <UserRoundPlus className="size-5 text-[#011478]" />
          </div>
          <div className="divide-y">
            {customer.travellers.map((traveller) => (
              <div key={traveller.id} className="grid gap-2 px-6 py-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-medium">{traveller.fullName}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {[traveller.relationship, traveller.nationality]
                      .filter(Boolean)
                      .join(" · ") || "No additional details"}
                  </p>
                </div>
                <p className="text-xs text-[#4b5563]">
                  {traveller.passportNumber ? `Passport ${traveller.passportNumber}` : ""}
                </p>
              </div>
            ))}
            {!customer.travellers.length ? (
              <p className="px-6 py-10 text-center text-sm text-[#6b7280]">
                No traveller profiles yet.
              </p>
            ) : null}
          </div>
          <details className="border-t bg-[#f9fafb]">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold">
              Add traveller
            </summary>
            <form action={addTravellerAction} className="grid gap-4 border-t p-6 sm:grid-cols-2">
              <input type="hidden" name="customerId" value={customer.id} />
              {[
                ["fullName", "Full name"],
                ["relationship", "Relationship to lead customer"],
                ["dateOfBirth", "Date of birth"],
                ["nationality", "Nationality"],
                ["passportNumber", "Passport number"],
                ["passportExpiry", "Passport expiry"],
                ["visaStatus", "Visa status"],
                ["roomPreference", "Room preference"],
                ["emergencyContact", "Emergency contact"],
              ].map(([name, label]) => (
                <label key={name}>
                  <span className="text-sm font-medium">{label}</span>
                  <input
                    className={inputClass}
                    name={name}
                    type={name.includes("Date") || name === "passportExpiry" ? "date" : "text"}
                    required={name === "fullName"}
                  />
                </label>
              ))}
              <label className="sm:col-span-2">
                <span className="text-sm font-medium">Dietary requirements</span>
                <input className={inputClass} name="dietaryNeeds" />
              </label>
              <label className="sm:col-span-2">
                <span className="text-sm font-medium">Accessibility or medical note</span>
                <input className={inputClass} name="accessibilityNote" />
              </label>
              <div className="sm:col-span-2">
                <button className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">
                  Save traveller
                </button>
              </div>
            </form>
          </details>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-6 py-5">
            <h2 className="font-semibold">Recent enquiries</h2>
            <p className="mt-1 text-xs text-[#6b7280]">
              Requests and planning activity
            </p>
          </div>
          <div className="divide-y">
            {customer.enquiries.map((enquiry) => (
              <Link key={enquiry.id} href={`/enquiries/${enquiry.id}`} className="block px-6 py-4 hover:bg-[#f9fafb]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{enquiry.reference}</p>
                  <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] capitalize text-[#4b5563]">
                    {enquiry.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#6b7280]">
                  {enquiry.proposedStartDate
                    ? enquiry.proposedStartDate.toLocaleDateString("en-UG")
                    : "Dates not set"}
                </p>
              </Link>
            ))}
            {!customer.enquiries.length ? (
              <p className="px-6 py-10 text-center text-sm text-[#6b7280]">
                No enquiries recorded yet.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
