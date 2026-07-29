"use client";

import { useState } from "react";
import { saveTourPricingAction } from "@/modules/costing/actions/tour-costing";

const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";

type AdjustmentMethod = "NONE" | "PERCENTAGE" | "FIXED" | "PER_PERSON" | "PER_DAY";

export function TourPricingForm({
  tourId,
  disabled,
  defaults,
}: {
  tourId: string;
  disabled: boolean;
  defaults: {
    markupMethod: string;
    markupValue: string;
    contingencyValue: string;
    taxValue: string;
    discountValue: string;
    minimumMargin: string;
  };
}) {
  const [markup, setMarkup] = useState(defaults.markupMethod);
  const [contingency, setContingency] = useState<AdjustmentMethod>(
    Number(defaults.contingencyValue) > 0 ? "FIXED" : "NONE",
  );
  const [tax, setTax] = useState<"NONE" | "PERCENTAGE" | "FIXED">(
    Number(defaults.taxValue) > 0 ? "FIXED" : "NONE",
  );
  const [discount, setDiscount] = useState<"NONE" | "PERCENTAGE" | "FIXED" | "PER_PERSON">(
    Number(defaults.discountValue) > 0 ? "FIXED" : "NONE",
  );

  const valueLabel =
    markup === "TARGET_MARGIN"
      ? "Target margin %"
      : markup === "TARGET_PRICE"
        ? "Final selling price"
        : markup === "PERCENTAGE"
          ? "Markup %"
          : markup === "PER_PERSON"
            ? "Profit per traveller"
            : "Fixed profit";

  return (
    <form action={saveTourPricingAction} className="mt-5 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="tourId" value={tourId} />

      <label className="text-xs font-medium">
        How do you want to set the selling price?
        <select className={input} name="markupMethod" value={markup} onChange={(event) => setMarkup(event.target.value)}>
          <option value="PERCENTAGE">Add a percentage markup</option>
          <option value="TARGET_PRICE">Enter the final selling price</option>
          <option value="TARGET_MARGIN">Set a target profit margin</option>
          <option value="FIXED">Add a fixed profit amount</option>
          <option value="PER_PERSON">Add profit per traveller</option>
        </select>
      </label>
      <label className="text-xs font-medium">
        {valueLabel}
        <input className={input} name="markupValue" type="number" min={0} step="0.01" defaultValue={defaults.markupValue} required />
      </label>

      <details className="rounded-xl border bg-[#fafaf7] sm:col-span-2">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#176b55]">
          Advanced adjustments
        </summary>
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
          <AdjustmentField
            label="Contingency"
            name="contingency"
            method={contingency}
            setMethod={(value) => setContingency(value as AdjustmentMethod)}
            value={defaults.contingencyValue}
            options={[
              ["NONE", "No contingency"],
              ["PERCENTAGE", "Percentage of cost"],
              ["FIXED", "Fixed amount"],
              ["PER_PERSON", "Per traveller"],
              ["PER_DAY", "Per tour day"],
            ]}
          />
          <AdjustmentField
            label="Tax"
            name="tax"
            method={tax}
            setMethod={(value) => setTax(value as typeof tax)}
            value={defaults.taxValue}
            options={[["NONE", "No extra tax"], ["PERCENTAGE", "Percentage"], ["FIXED", "Fixed amount"]]}
          />
          <AdjustmentField
            label="Discount"
            name="discount"
            method={discount}
            setMethod={(value) => setDiscount(value as typeof discount)}
            value={defaults.discountValue}
            options={[
              ["NONE", "No discount"],
              ["PERCENTAGE", "Percentage"],
              ["FIXED", "Fixed amount"],
              ["PER_PERSON", "Per traveller"],
            ]}
          />
          <label className="text-xs font-medium">
            Minimum acceptable margin %
            <input className={input} name="minimumMargin" type="number" min={0} max={99.99} step="0.01" defaultValue={defaults.minimumMargin} placeholder="Optional safety threshold" />
          </label>
          <label className="text-xs font-medium sm:col-span-2">
            Reason for pricing below the minimum margin
            <input className={input} name="belowMinimumReason" placeholder="Only required if the calculated margin is below the minimum" />
          </label>
        </div>
      </details>

      <div className="sm:col-span-2">
        <button disabled={disabled} className="h-11 rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white disabled:opacity-50">
          Calculate and save price
        </button>
      </div>
    </form>
  );
}

function AdjustmentField({
  label,
  name,
  method,
  setMethod,
  value,
  options,
}: {
  label: string;
  name: string;
  method: string;
  setMethod: (value: string) => void;
  value: string;
  options: [string, string][];
}) {
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <label className="text-xs font-medium">
        {label}
        <select className={input} name={`${name}Method`} value={method} onChange={(event) => setMethod(event.target.value)}>
          {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
      </label>
      {method === "NONE" ? (
        <input type="hidden" name={`${name}Value`} value="0" />
      ) : (
        <label className="text-xs font-medium">
          {label} value
          <input className={input} name={`${name}Value`} type="number" min={0} step="0.01" defaultValue={value} required />
        </label>
      )}
    </div>
  );
}
