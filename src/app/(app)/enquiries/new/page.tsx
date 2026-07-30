import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEnquiryAction } from "@/modules/enquiries/actions/enquiries";
import { getEnquiryFormOptions } from "@/modules/enquiries/queries/enquiries";

export const metadata = { title: "New enquiry" };
export const dynamic = "force-dynamic";

const inputClass =
  "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";
const textareaClass =
  "mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";

export default async function NewEnquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const options = await getEnquiryFormOptions();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/enquiries" className="inline-flex items-center gap-2 text-sm text-[#4b5563]">
        <ArrowLeft className="size-4" /> Back to enquiries
      </Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">New enquiry</h1>
      <p className="mt-2 text-sm text-[#4b5563]">
        Capture the guest’s request, dates, budget, and next follow-up.
      </p>

      <form action={createEnquiryAction} className="mt-7 rounded-xl border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Customer</span>
            <select className={inputClass} name="customerId" required defaultValue={customerId ?? ""}>
              <option value="" disabled>Select customer</option>
              {options.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName} · {customer.reference}
                </option>
              ))}
            </select>
            <Link href="/customers/new" className="mt-2 inline-block text-xs font-semibold text-[#011478]">
              Create a customer first
            </Link>
          </label>
          <label>
            <span className="text-sm font-medium">Source</span>
            <select className={inputClass} name="source" defaultValue="Website">
              {["Website", "Email", "Phone", "WhatsApp", "Walk-in", "Referral", "Social media", "Travel agent", "Corporate client", "Returning customer", "Other"].map(
                (source) => <option key={source}>{source}</option>,
              )}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Proposed start</span>
            <input className={inputClass} name="proposedStartDate" type="date" />
          </label>
          <label>
            <span className="text-sm font-medium">Proposed end</span>
            <input className={inputClass} name="proposedEndDate" type="date" />
          </label>
          <label className="flex items-end gap-3 pb-3">
            <input name="flexibleDates" type="checkbox" className="size-4 accent-[#011478]" />
            <span className="text-sm font-medium">Dates are flexible</span>
          </label>
          <label>
            <span className="text-sm font-medium">Adults</span>
            <input className={inputClass} name="adults" type="number" min={1} defaultValue={1} required />
          </label>
          <label>
            <span className="text-sm font-medium">Children</span>
            <input className={inputClass} name="children" type="number" min={0} defaultValue={0} required />
          </label>
          <label>
            <span className="text-sm font-medium">Child ages</span>
            <input className={inputClass} name="childAges" placeholder="6, 9" />
          </label>
          <label>
            <span className="text-sm font-medium">Rooms</span>
            <input className={inputClass} name="rooms" type="number" min={1} />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Destinations of interest</span>
            <input className={inputClass} name="destinationsOfInterest" placeholder="Bwindi, Queen Elizabeth, Jinja" />
          </label>
          <label>
            <span className="text-sm font-medium">Customer budget</span>
            <input className={inputClass} name="customerBudget" inputMode="decimal" />
          </label>
          <label>
            <span className="text-sm font-medium">Budget currency</span>
            <select className={inputClass} name="budgetCurrencyCode" defaultValue="USD">
              {options.currencies.map((currency) => (
                <option key={currency.code}>{currency.code}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Initial follow-up</span>
            <input className={inputClass} name="followUpAt" type="datetime-local" />
          </label>
        </div>

        <details className="mt-6 rounded-lg border bg-[#f9fafb]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">More details</summary>
          <div className="grid gap-5 border-t p-4 sm:grid-cols-2">
            {[
              ["arrivalLocation", "Arrival location"],
              ["departureLocation", "Departure location"],
              ["accommodationPreference", "Accommodation preference"],
              ["activityInterests", "Activity interests"],
              ["transportPreference", "Transport preference"],
            ].map(([name, label]) => (
              <label key={name}>
                <span className="text-sm font-medium">{label}</span>
                <input className={inputClass} name={name} />
              </label>
            ))}
            {[
              ["dietaryRequirements", "Dietary requirements"],
              ["accessibilityRequirements", "Accessibility requirements"],
              ["specialRequests", "Special requests"],
              ["notes", "Internal notes"],
            ].map(([name, label]) => (
              <label key={name} className="sm:col-span-2">
                <span className="text-sm font-medium">{label}</span>
                <textarea className={textareaClass} name={name} />
              </label>
            ))}
          </div>
        </details>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/enquiries" className="grid h-11 place-items-center rounded-lg border px-5 text-sm font-semibold">
            Cancel
          </Link>
          <button className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">
            Create enquiry
          </button>
        </div>
      </form>
    </div>
  );
}
