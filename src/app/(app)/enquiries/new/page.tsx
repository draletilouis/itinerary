import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EnquiryCustomerFields } from "@/components/enquiry-customer-fields";
import { fieldClass, primaryButtonClass, textareaClass } from "@/components/ui/form-styles";
import { createEnquiryWithCustomerAction } from "@/modules/enquiries/actions/create-enquiry";
import { getEnquiryFormOptions } from "@/modules/enquiries/queries/enquiries";

export const metadata = { title: "New enquiry" };
export const dynamic = "force-dynamic";

export default async function NewEnquiryPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams;
  const options = await getEnquiryFormOptions();
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/enquiries" className="inline-flex items-center gap-2 text-sm text-[#4b5563]"><ArrowLeft className="size-4" /> Back to enquiries</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#011478]">Sales</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">New enquiry</h1>
      <p className="mt-2 text-sm text-[#4b5563]">Capture the essentials now. Add extra travel preferences only when they are known.</p>
      <form action={createEnquiryWithCustomerAction} className="mt-7 space-y-6">
        <EnquiryCustomerFields customers={options.customers} defaultCustomerId={customerId} />
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <h2 className="font-semibold">Request essentials</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium">Source<select className={fieldClass} name="source" defaultValue="WhatsApp">{["WhatsApp", "Phone", "Email", "Website", "Walk-in", "Referral", "Social media", "Travel agent", "Corporate client", "Returning customer", "Other"].map((source) => <option key={source}>{source}</option>)}</select></label>
            <label className="text-sm font-medium lg:col-span-2">Destinations<input className={fieldClass} name="destinationsOfInterest" placeholder="Bwindi, Queen Elizabeth, Jinja" /></label>
            <label className="text-sm font-medium">Proposed start<input className={fieldClass} name="proposedStartDate" type="date" /></label>
            <label className="text-sm font-medium">Proposed end<input className={fieldClass} name="proposedEndDate" type="date" /></label>
            <label className="flex items-end gap-3 pb-3"><input name="flexibleDates" type="checkbox" className="size-4 accent-[#011478]" /><span className="text-sm font-medium">Dates are flexible</span></label>
            <label className="text-sm font-medium">Adults<input className={fieldClass} name="adults" type="number" min={1} defaultValue={1} required /></label>
            <label className="text-sm font-medium">Children<input className={fieldClass} name="children" type="number" min={0} defaultValue={0} required /></label>
            <label className="text-sm font-medium">Rooms<input className={fieldClass} name="rooms" type="number" min={1} /></label>
            <label className="text-sm font-medium">Budget<input className={fieldClass} name="customerBudget" inputMode="decimal" /></label>
            <label className="text-sm font-medium">Currency<select className={fieldClass} name="budgetCurrencyCode" defaultValue="USD">{options.currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></label>
            <label className="text-sm font-medium">Next follow-up<input className={fieldClass} name="followUpAt" type="datetime-local" /></label>
          </div>
        </section>
        <details className="rounded-xl border bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold">Optional travel details <span className="text-xs font-normal text-gray-500">Add when known</span></summary>
          <div className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <label className="text-sm font-medium">Child ages<input className={fieldClass} name="childAges" placeholder="6, 9" /></label>
            {["arrivalLocation:Arrival location", "departureLocation:Departure location", "accommodationPreference:Accommodation preference", "activityInterests:Activity interests", "transportPreference:Transport preference"].map((entry) => { const [name, label] = entry.split(":"); return <label key={name} className="text-sm font-medium">{label}<input className={fieldClass} name={name} /></label>; })}
            {["dietaryRequirements:Dietary requirements", "accessibilityRequirements:Accessibility requirements", "specialRequests:Special requests", "notes:Internal notes"].map((entry) => { const [name, label] = entry.split(":"); return <label key={name} className="text-sm font-medium sm:col-span-2">{label}<textarea className={textareaClass} name={name} /></label>; })}
          </div>
        </details>
        <div className="flex justify-end gap-3"><Link href="/enquiries" className="inline-flex h-11 items-center rounded-lg border bg-white px-5 text-sm font-semibold">Cancel</Link><button className={primaryButtonClass}>Create enquiry</button></div>
      </form>
    </div>
  );
}
