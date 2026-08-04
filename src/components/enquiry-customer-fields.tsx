"use client";

import { useState } from "react";
import { fieldClass } from "@/components/ui/form-styles";
import { cn } from "@/lib/utils";

export function EnquiryCustomerFields({ customers, defaultCustomerId }: { customers: { id: string; fullName: string; reference: string }[]; defaultCustomerId?: string }) {
  const [choice, setChoice] = useState(defaultCustomerId || customers.length ? "existing" : "new");
  return (
    <section className="rounded-xl border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Customer</h2><p className="mt-1 text-xs text-gray-500">Find a saved customer or create one here.</p></div>
        <div className="flex rounded-lg bg-gray-100 p-1 text-xs font-semibold"><button type="button" onClick={() => setChoice("existing")} className={cn("rounded-md px-3 py-2", choice === "existing" && "bg-white text-[#011478] shadow-sm")}>Existing</button><button type="button" onClick={() => setChoice("new")} className={cn("rounded-md px-3 py-2", choice === "new" && "bg-white text-[#011478] shadow-sm")}>New customer</button></div>
      </div>
      {choice === "existing" ? <label className="mt-4 block text-sm font-medium">Customer<select className={fieldClass} name="customerId" required defaultValue={defaultCustomerId ?? ""}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.reference}</option>)}</select></label> : <div className="mt-4 grid gap-4 sm:grid-cols-2"><input type="hidden" name="customerId" value="" /><label className="text-sm font-medium">Full name<input className={fieldClass} name="newCustomerName" required /></label><label className="text-sm font-medium">Phone<input className={fieldClass} name="newCustomerPhone" required /></label><label className="text-sm font-medium sm:col-span-2">Email <span className="font-normal text-gray-400">(optional)</span><input className={fieldClass} name="newCustomerEmail" type="email" /></label></div>}
    </section>
  );
}
