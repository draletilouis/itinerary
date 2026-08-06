"use client";

import { useMemo, useState } from "react";
import { FileText, PackageOpen, Sparkles } from "lucide-react";
import { createTourFromWizardAction } from "@/modules/tours/actions/create-tour";
import { fieldClass, primaryButtonClass } from "@/components/ui/form-styles";
import { travellerMixFieldEntries } from "@/modules/costing/traveller-categories";
import { cn } from "@/lib/utils";

type Customer = { id: string; fullName: string; reference: string };
type Package = { id: string; reference: string; revision: number; name: string; type: string; durationDays: number; defaultAdults: number; defaultChildren: number; costingCurrencyCode: string; quotationCurrencyCode: string };
type Enquiry = { id: string; reference: string; customerId: string; customerName: string; proposedStartDate: string | null; proposedEndDate: string | null; adults: number; children: number; budgetCurrencyCode: string | null };

const tourTypes = ["CUSTOM", "STANDARD_PACKAGE", "GROUP_DEPARTURE", "PRIVATE", "CORPORATE", "SCHOOL", "DAY", "MULTI_DAY"];
const modes = [
  { value: "ENQUIRY", label: "From enquiry", detail: "Use an existing guest request", icon: FileText },
  { value: "PACKAGE", label: "From package", detail: "Start with a reusable template", icon: PackageOpen },
  { value: "DIRECT", label: "Direct tour", detail: "Create a custom tour", icon: Sparkles },
] as const;

const today = () => new Date().toISOString().slice(0, 10);
function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function TourCreationForm({ customers, currencies, packages, enquiries }: {
  customers: Customer[];
  currencies: { code: string }[];
  packages: Package[];
  enquiries: Enquiry[];
}) {
  const initialMode = enquiries.length ? "ENQUIRY" : packages.length ? "PACKAGE" : "DIRECT";
  const [mode, setMode] = useState<(typeof modes)[number]["value"]>(initialMode);
  const [enquiryId, setEnquiryId] = useState(enquiries[0]?.id ?? "");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [customerChoice, setCustomerChoice] = useState(customers.length ? "existing" : "new");
  const enquiry = useMemo(() => enquiries.find((item) => item.id === enquiryId), [enquiries, enquiryId]);
  const selectedPackage = useMemo(() => packages.find((item) => item.id === packageId), [packages, packageId]);
  const start = enquiry?.proposedStartDate ?? today();
  const end = enquiry?.proposedEndDate ?? addDays(start, (selectedPackage?.durationDays ?? 7) - 1);

  return (
    <form action={createTourFromWizardAction} className="mt-7 space-y-6">
      <input type="hidden" name="mode" value={mode} />
      <section className="rounded-xl border bg-white p-5 sm:p-6">
        <h2 className="font-semibold">How is this tour starting?</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {modes.map((option) => {
            const Icon = option.icon;
            const disabled = (option.value === "ENQUIRY" && !enquiries.length) || (option.value === "PACKAGE" && !packages.length);
            return (
              <button key={option.value} type="button" disabled={disabled} onClick={() => setMode(option.value)} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-45", mode === option.value ? "border-[#011478] bg-[#eff3ff] ring-1 ring-[#011478]" : "hover:border-blue-300")}>
                <Icon className="mt-0.5 size-5 shrink-0 text-[#011478]" />
                <span><span className="block text-sm font-semibold">{option.label}</span><span className="mt-1 block text-xs text-[#6b7280]">{option.detail}</span></span>
              </button>
            );
          })}
        </div>
        {mode === "ENQUIRY" ? (
          <label className="mt-5 block text-sm font-medium">Enquiry<select className={fieldClass} name="enquiryId" value={enquiryId} onChange={(event) => setEnquiryId(event.target.value)} required>{enquiries.map((item) => <option key={item.id} value={item.id}>{item.reference} / {item.customerName}</option>)}</select></label>
        ) : <input type="hidden" name="enquiryId" value="" />}
        {mode === "PACKAGE" ? (
          <>
          <label className="mt-5 block text-sm font-medium">Package<select className={fieldClass} name="packageId" value={packageId} onChange={(event) => setPackageId(event.target.value)} required>{packages.map((item) => <option key={item.id} value={item.id}>{item.reference} / {item.name} / revision {item.revision}</option>)}</select></label>
          <label className="mt-4 block text-sm font-medium">Package option<select className={fieldClass} name="packageVariant" defaultValue="BASE"><option value="BASE">Base package only</option><option value="ALL_OPTIONS">Include all optional upgrades</option></select><span className="mt-1 block text-[11px] text-gray-500">Optional costs are added only when selected.</span></label>
          </>
        ) : <><input type="hidden" name="packageId" value="" /><input type="hidden" name="packageVariant" value="BASE" /></>}
      </section>

      {mode !== "ENQUIRY" ? (
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold">Customer</h2><p className="mt-1 text-xs text-[#6b7280]">Select a saved customer or add one here.</p></div>
            <div className="flex rounded-lg bg-gray-100 p-1 text-xs font-semibold">
              <button type="button" onClick={() => setCustomerChoice("existing")} className={cn("rounded-md px-3 py-2", customerChoice === "existing" && "bg-white text-[#011478] shadow-sm")}>Existing</button>
              <button type="button" onClick={() => setCustomerChoice("new")} className={cn("rounded-md px-3 py-2", customerChoice === "new" && "bg-white text-[#011478] shadow-sm")}>New customer</button>
            </div>
          </div>
          {customerChoice === "existing" ? (
            <label className="mt-4 block text-sm font-medium">Customer<select className={fieldClass} name="customerId" required><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} / {customer.reference}</option>)}</select></label>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><input type="hidden" name="customerId" value="" /><label className="text-sm font-medium">Full name<input className={fieldClass} name="newCustomerName" required /></label><label className="text-sm font-medium">Phone<input className={fieldClass} name="newCustomerPhone" required /></label><label className="text-sm font-medium sm:col-span-2">Email <span className="font-normal text-gray-400">(optional)</span><input className={fieldClass} name="newCustomerEmail" type="email" /></label></div>
          )}
        </section>
      ) : <input type="hidden" name="customerId" value={enquiry?.customerId ?? ""} />}

      <section className="rounded-xl border bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Tour essentials</h2>
        <div key={`${mode}-${enquiryId}-${packageId}`} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Tour name<input className={fieldClass} name="name" required defaultValue={selectedPackage?.name ?? (enquiry ? `${enquiry.customerName} Tour` : "")} /></label>
          <label className="text-sm font-medium">Tour type<select className={fieldClass} name="type" defaultValue={selectedPackage?.type ?? "CUSTOM"}>{tourTypes.map((type) => <option key={type} value={type}>{type.toLowerCase().replaceAll("_", " ")}</option>)}</select></label><div className="hidden sm:block" />
          <label className="text-sm font-medium">Start date<input className={fieldClass} name="startDate" type="date" required defaultValue={start} /></label><label className="text-sm font-medium">End date<input className={fieldClass} name="endDate" type="date" required defaultValue={end} /></label>
          <label className="text-sm font-medium">Adults<input className={fieldClass} name="adults" type="number" min={1} required defaultValue={enquiry?.adults ?? selectedPackage?.defaultAdults ?? 2} /></label><label className="text-sm font-medium">Children<input className={fieldClass} name="children" type="number" min={0} required defaultValue={enquiry?.children ?? selectedPackage?.defaultChildren ?? 0} /></label>
          <div className="rounded-lg border bg-[#f9fafb] p-4 sm:col-span-2"><h3 className="text-sm font-semibold">Traveller pricing mix</h3><p className="mt-1 text-xs text-gray-500">These totals must match the adult and child counts above.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{travellerMixFieldEntries.map(({ fieldName, label, pricingCategory, ageBand }) => { const defaultValue = pricingCategory === "FOREIGNERS" ? ageBand === "ADULT" ? enquiry?.adults ?? selectedPackage?.defaultAdults ?? 2 : enquiry?.children ?? selectedPackage?.defaultChildren ?? 0 : 0; return <label key={fieldName} className="text-xs font-medium">{label}<input className={fieldClass} name={fieldName} type="number" min={0} required defaultValue={Number(defaultValue)} /></label>; })}</div></div>
          <label className="text-sm font-medium">Costing currency<select className={fieldClass} name="costingCurrencyCode" defaultValue={selectedPackage?.costingCurrencyCode ?? "USD"}>{currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></label><label className="text-sm font-medium">Quotation currency<select className={fieldClass} name="quotationCurrencyCode" defaultValue={enquiry?.budgetCurrencyCode ?? selectedPackage?.quotationCurrencyCode ?? "USD"}>{currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></label>
        </div>
      </section>
      <div className="flex justify-end"><button className={primaryButtonClass}>Create tour and open workspace</button></div>
    </form>
  );
}
