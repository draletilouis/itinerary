"use client";

import { useState } from "react";
import { createTourPackageAction } from "@/modules/packages/actions/packages";
import { packageNights } from "@/modules/packages/presentation";

const input = "mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm";

export function PackageBasicsForm({
  currencies,
}: {
  currencies: { code: string }[];
}) {
  const [days, setDays] = useState(6);

  return (
    <form action={createTourPackageAction} className="mt-5 space-y-4">
      <label className="block text-xs font-medium">
        Package name
        <input
          className={input}
          name="name"
          required
          placeholder="e.g. 3-Day Queen Elizabeth Safari"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium">
          Tour days
          <input
            className={input}
            name="durationDays"
            type="number"
            min={1}
            max={60}
            value={days}
            onChange={(event) => setDays(Number(event.target.value) || 1)}
            required
          />
        </label>
        <div className="rounded-xl bg-[#f2f8f5] p-3">
          <p className="text-xs text-[#68736e]">Package duration</p>
          <p className="mt-2 text-sm font-semibold text-[#176b55]">
            {days} days / {packageNights(days)} nights
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium">
          Default adults
          <input
            className={input}
            name="defaultAdults"
            type="number"
            min={1}
            defaultValue={2}
            required
          />
        </label>
        <label className="text-xs font-medium">
          Currency
          <select className={input} name="costingCurrencyCode" defaultValue="USD">
            {currencies.map((currency) => (
              <option key={currency.code}>{currency.code}</option>
            ))}
          </select>
        </label>
      </div>

      <details className="rounded-xl border bg-[#fafaf7]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#176b55]">
          Optional package details
        </summary>
        <div className="grid gap-4 border-t p-4">
          <label className="text-xs font-medium">
            Default children
            <input
              className={input}
              name="defaultChildren"
              type="number"
              min={0}
              defaultValue={0}
            />
          </label>
          <label className="text-xs font-medium">
            Package type
            <select className={input} name="type" defaultValue="STANDARD_PACKAGE">
              <option value="STANDARD_PACKAGE">Standard package</option>
              <option value="GROUP_DEPARTURE">Group departure</option>
              <option value="PRIVATE">Private tour</option>
              <option value="CORPORATE">Corporate</option>
              <option value="SCHOOL">School trip</option>
              <option value="DAY">Day tour</option>
              <option value="MULTI_DAY">Multi-day tour</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            Short description
            <textarea
              className="mt-2 min-h-20 w-full rounded-xl border bg-white p-3 text-sm"
              name="description"
            />
          </label>
        </div>
      </details>

      <p className="text-xs leading-5 text-[#7b8580]">
        Customer currency initially matches the costing currency. Pricing and other
        advanced settings are configured after creation.
      </p>
      <button className="h-11 w-full rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">
        Create package and add itinerary
      </button>
    </form>
  );
}
