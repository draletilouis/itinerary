"use client";

import { useState } from "react";
import { updateTourPackagePricingAction } from "@/modules/packages/actions/packages";

const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";

export function PackagePricingForm({
  packageId,
  defaults,
}: {
  packageId: string;
  defaults: {
    contingencyMethod: string;
    contingencyValue: string;
    markupMethod: string;
    markupValue: string;
    taxMethod: string;
    taxValue: string;
    discountMethod: string;
    discountValue: string;
    minimumMargin: string;
  };
}) {
  const [contingency, setContingency] = useState(defaults.contingencyMethod);
  const [markup, setMarkup] = useState(defaults.markupMethod);
  const [tax, setTax] = useState(defaults.taxMethod);
  const [discount, setDiscount] = useState(defaults.discountMethod);

  return (
    <form action={updateTourPackagePricingAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="packageId" value={packageId} />
      <label className="text-xs font-medium">
        Contingency
        <select
          className={input}
          name="defaultContingencyMethod"
          value={contingency}
          onChange={(event) => setContingency(event.target.value)}
        >
          <option value="NONE">No contingency</option>
          <option value="PERCENTAGE">Percentage of cost</option>
          <option value="FIXED">Fixed amount</option>
          <option value="PER_PERSON">Per traveller</option>
          <option value="PER_DAY">Per tour day</option>
        </select>
      </label>
      {contingency === "NONE" ? (
        <input type="hidden" name="defaultContingencyValue" value="0" />
      ) : (
        <label className="text-xs font-medium">
          Contingency value
          <input
            className={input}
            name="defaultContingencyValue"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.contingencyValue}
            required
          />
        </label>
      )}

      <label className="text-xs font-medium">
        How should profit be added?
        <select
          className={input}
          name="defaultMarkupMethod"
          value={markup}
          onChange={(event) => setMarkup(event.target.value)}
        >
          <option value="PERCENTAGE">Percentage markup</option>
          <option value="FIXED">Fixed profit amount</option>
          <option value="PER_PERSON">Profit per traveller</option>
          <option value="TARGET_PRICE">Target total selling price</option>
          <option value="TARGET_MARGIN">Target profit margin</option>
        </select>
      </label>
      <label className="text-xs font-medium">
        {markup === "TARGET_MARGIN"
          ? "Target margin %"
          : markup === "TARGET_PRICE"
            ? "Target selling price"
            : markup === "PERCENTAGE"
              ? "Markup %"
              : "Profit value"}
        <input
          className={input}
          name="defaultMarkupValue"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaults.markupValue}
          required
        />
      </label>

      <details className="rounded-xl border bg-[#fafaf7] sm:col-span-2">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#176b55]">
          Advanced pricing: tax, discount and margin protection
        </summary>
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
          <label className="text-xs font-medium">
            Tax
            <select
              className={input}
              name="defaultTaxMethod"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
            >
              <option value="NONE">No tax</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </label>
          {tax === "NONE" ? (
            <input type="hidden" name="defaultTaxValue" value="0" />
          ) : (
            <label className="text-xs font-medium">
              Tax value
              <input
                className={input}
                name="defaultTaxValue"
                type="number"
                min={0}
                step="0.01"
                defaultValue={defaults.taxValue}
                required
              />
            </label>
          )}

          <label className="text-xs font-medium">
            Default discount
            <select
              className={input}
              name="defaultDiscountMethod"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            >
              <option value="NONE">No discount</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
              <option value="PER_PERSON">Per traveller</option>
            </select>
          </label>
          {discount === "NONE" ? (
            <input type="hidden" name="defaultDiscountValue" value="0" />
          ) : (
            <label className="text-xs font-medium">
              Discount value
              <input
                className={input}
                name="defaultDiscountValue"
                type="number"
                min={0}
                step="0.01"
                defaultValue={defaults.discountValue}
                required
              />
            </label>
          )}

          <label className="text-xs font-medium sm:col-span-2">
            Minimum acceptable margin %
            <input
              className={input}
              name="minimumMargin"
              type="number"
              min={0}
              max={99.99}
              step="0.01"
              defaultValue={defaults.minimumMargin}
              placeholder="Optional safety threshold"
            />
          </label>
        </div>
      </details>

      <div className="sm:col-span-2">
        <button className="h-11 rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white">
          Save pricing defaults
        </button>
      </div>
    </form>
  );
}
