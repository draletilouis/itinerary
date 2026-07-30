"use client";

import { useMemo, useState } from "react";
import { addPackageCostAction } from "@/modules/packages/actions/packages";
import {
  estimatePackageCost,
  packageCostBasisLabels,
  packageNights,
  suggestedCostBasis,
} from "@/modules/packages/presentation";
import type { PackageCostTemplate } from "@/modules/packages/types";

const input = "mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm";
const categories = [
  "Accommodation",
  "Activities",
  "Transport",
  "Meals",
  "Permits",
  "Guides",
  "Other",
];
const bases = Object.keys(packageCostBasisLabels) as PackageCostTemplate["basis"][];

export function PackageCostForm({
  packageId,
  durationDays,
  defaultTravellers,
  costingCurrencyCode,
  currencies,
  suppliers,
  itineraryDays,
}: {
  packageId: string;
  durationDays: number;
  defaultTravellers: number;
  costingCurrencyCode: string;
  currencies: { code: string }[];
  suppliers: { id: string; name: string }[];
  itineraryDays: { dayNumber: number; title: string }[];
}) {
  const [category, setCategory] = useState("Accommodation");
  const [basis, setBasis] =
    useState<PackageCostTemplate["basis"]>("ACCOMMODATION");
  const [unitCost, setUnitCost] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [days, setDays] = useState(String(durationDays));
  const [nights, setNights] = useState(String(packageNights(durationDays)));
  const [rooms, setRooms] = useState("1");
  const [vehicles, setVehicles] = useState("1");
  const [travellers, setTravellers] = useState(String(defaultTravellers));
  const [overrideTotal, setOverrideTotal] = useState("0");
  const [tax, setTax] = useState("0");
  const [commission, setCommission] = useState("0");
  const [currency, setCurrency] = useState(costingCurrencyCode);

  const preview = useMemo(
    () =>
      estimatePackageCost({
        basis,
        unitCost,
        quantity,
        days,
        nights,
        rooms,
        vehicles,
        eligibleTravellers: travellers,
        taxPercentage: tax,
        commissionPercentage: commission,
        overrideTotal,
      }),
    [
      basis,
      commission,
      days,
      nights,
      overrideTotal,
      quantity,
      rooms,
      tax,
      travellers,
      unitCost,
      vehicles,
    ],
  );

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    setBasis(suggestedCostBasis(nextCategory));
  }

  return (
    <form action={addPackageCostAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="packageId" value={packageId} />

      <label className="text-xs font-medium">
        What is the cost for?
        <select
          className={input}
          name="category"
          value={category}
          onChange={(event) => changeCategory(event.target.value)}
        >
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium sm:col-span-2">
        Description
        <input
          className={input}
          name="description"
          required
          placeholder="e.g. Professional guide fee"
        />
      </label>
      <label className="text-xs font-medium">
        Supplier
        <select className={input} name="supplierId">
          <option value="">Direct / not assigned</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-medium sm:col-span-2">
        How is this charged?
        <select
          className={input}
          name="basis"
          value={basis}
          onChange={(event) =>
            setBasis(event.target.value as PackageCostTemplate["basis"])
          }
        >
          {bases.map((item) => (
            <option key={item} value={item}>
              {packageCostBasisLabels[item]}
            </option>
          ))}
        </select>
      </label>
      {basis !== "OVERRIDE" ? (
        <label className="text-xs font-medium">
          {basis === "ACCOMMODATION"
            ? "Rate per room/night"
            : basis === "PER_PERSON"
              ? "Rate per traveller"
              : basis === "VEHICLE"
                ? "Rate per vehicle/day"
                : "Unit cost"}
          <input
            className={input}
            name="unitCost"
            type="number"
            min={0}
            step="0.01"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            required
          />
        </label>
      ) : (
        <input type="hidden" name="unitCost" value="0" />
      )}
      <label className="text-xs font-medium">
        Currency
        <select
          className={input}
          name="originalCurrencyCode"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
        >
          {currencies.map((entry) => (
            <option key={entry.code}>{entry.code}</option>
          ))}
        </select>
      </label>

      {basis === "STANDARD" ? (
        <>
          <label className="text-xs font-medium">
            Number of items
            <input
              className={input}
              name="quantity"
              type="number"
              min={0.01}
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>
          <label className="text-xs font-medium">
            Chargeable days
            <input
              className={input}
              name="days"
              type="number"
              min={0.01}
              step="0.01"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              required
            />
          </label>
        </>
      ) : null}

      {basis === "ACCOMMODATION" ? (
        <>
          <label className="text-xs font-medium">
            Rooms
            <input
              className={input}
              name="rooms"
              type="number"
              min={1}
              step="1"
              value={rooms}
              onChange={(event) => setRooms(event.target.value)}
              required
            />
          </label>
          <label className="text-xs font-medium">
            Nights
            <input
              className={input}
              name="nights"
              type="number"
              min={1}
              step="1"
              value={nights}
              onChange={(event) => setNights(event.target.value)}
              required
            />
          </label>
        </>
      ) : null}

      {basis === "PER_PERSON" ? (
        <label className="text-xs font-medium sm:col-span-2">
          People charged
          <input
            className={input}
            name="eligibleTravellers"
            type="number"
            min={1}
            step="1"
            value={travellers}
            onChange={(event) => setTravellers(event.target.value)}
            required
          />
          <span className="mt-1 block text-[11px] text-[#6b7280]">
            Filled from the package’s default guest count.
          </span>
        </label>
      ) : null}

      {basis === "VEHICLE" ? (
        <>
          <label className="text-xs font-medium">
            Vehicles
            <input
              className={input}
              name="vehicles"
              type="number"
              min={1}
              step="1"
              value={vehicles}
              onChange={(event) => setVehicles(event.target.value)}
              required
            />
          </label>
          <label className="text-xs font-medium">
            Chargeable days
            <input
              className={input}
              name="days"
              type="number"
              min={1}
              step="1"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              required
            />
          </label>
        </>
      ) : null}

      {basis === "OVERRIDE" ? (
        <>
          <label className="text-xs font-medium">
            Manual total
            <input
              className={input}
              name="overrideTotal"
              type="number"
              min={0}
              step="0.01"
              value={overrideTotal}
              onChange={(event) => setOverrideTotal(event.target.value)}
              required
            />
          </label>
          <label className="text-xs font-medium sm:col-span-2">
            Why is a manual total needed?
            <input className={input} name="overrideReason" required />
          </label>
        </>
      ) : null}

      <div className="rounded-lg border border-[#bfdbfe] bg-[#eff3ff] p-4 sm:col-span-2 lg:col-span-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#011478]">
          Cost preview
        </p>
        <p className="mt-2 text-sm text-[#4b5563]">
          {currency} {preview.formula}
          {preview.tax ? ` + ${tax}% tax` : ""}
          {preview.commission ? ` − ${commission}% commission` : ""}
        </p>
        <p className="mt-2 text-xl font-semibold">
          {currency}{" "}
          {preview.total.toLocaleString("en-UG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      <details className="rounded-lg border bg-white sm:col-span-2 lg:col-span-4">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#011478]">
          More options: itinerary day, tax and commission
        </summary>
        <div className="grid gap-4 border-t p-4 sm:grid-cols-3">
          <label className="text-xs font-medium">
            Itinerary day
            <select className={input} name="dayNumber">
              <option value="">Whole package / not linked</option>
              {itineraryDays.map((day) => (
                <option key={day.dayNumber} value={day.dayNumber}>
                  Day {day.dayNumber}: {day.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Tax %
            <input
              className={input}
              name="taxPercentage"
              type="number"
              min={0}
              step="0.01"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
            />
          </label>
          <label className="text-xs font-medium">
            Commission %
            <input
              className={input}
              name="commissionPercentage"
              type="number"
              min={0}
              step="0.01"
              value={commission}
              onChange={(event) => setCommission(event.target.value)}
            />
          </label>
        </div>
      </details>

      <div className="lg:col-span-4">
        <button className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">
          Add standard cost
        </button>
      </div>
    </form>
  );
}
