import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createCustomerAction } from "@/modules/customers/actions/customers";

export const metadata = { title: "New customer" };

const inputClass =
  "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";
const textareaClass =
  "mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-[#4b5563]">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">New customer</h1>
      <p className="mt-2 text-sm text-[#4b5563]">
        Start with essential contact details. Preferences can be expanded below.
      </p>

      <form action={createCustomerAction} className="mt-7 rounded-xl border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="text-sm font-medium">Customer type</span>
            <select className={inputClass} name="type" defaultValue="INDIVIDUAL">
              {[
                ["INDIVIDUAL", "Individual"],
                ["FAMILY", "Family"],
                ["GROUP", "Group"],
                ["CORPORATE", "Corporate client"],
                ["SCHOOL", "School"],
                ["ORGANISATION", "Organisation"],
                ["TRAVEL_AGENCY", "Travel agency"],
                ["TOUR_OPERATOR", "Tour operator"],
              ].map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Full name</span>
            <input className={inputClass} name="fullName" required />
          </label>
          <label>
            <span className="text-sm font-medium">Phone</span>
            <input className={inputClass} name="phone" required />
          </label>
          <label>
            <span className="text-sm font-medium">Email</span>
            <input className={inputClass} name="email" type="email" />
          </label>
          <label>
            <span className="text-sm font-medium">Organisation</span>
            <input className={inputClass} name="organisation" />
          </label>
          <label>
            <span className="text-sm font-medium">Preferred communication</span>
            <select className={inputClass} name="preferredCommunicationMethod" defaultValue="">
              <option value="">Not specified</option>
              <option>Email</option>
              <option>Phone</option>
              <option>WhatsApp</option>
            </select>
          </label>
        </div>

        <details className="mt-6 rounded-lg border bg-[#f9fafb]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">More details</summary>
          <div className="grid gap-5 border-t p-4 sm:grid-cols-2">
            {[
              ["alternativePhone", "Alternative phone"],
              ["country", "Country"],
              ["nationality", "Nationality"],
              ["address", "Address"],
              ["emergencyContact", "Emergency contact"],
              ["tags", "Tags, separated by commas"],
            ].map(([name, label]) => (
              <label key={name}>
                <span className="text-sm font-medium">{label}</span>
                <input className={inputClass} name={name} />
              </label>
            ))}
            {[
              ["travelPreferences", "Travel preferences"],
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
          <Link href="/customers" className="grid h-11 place-items-center rounded-lg border px-5 text-sm font-semibold">
            Cancel
          </Link>
          <button className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">
            Create customer
          </button>
        </div>
      </form>
    </div>
  );
}
