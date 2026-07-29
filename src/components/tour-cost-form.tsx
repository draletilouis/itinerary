"use client";

import { useMemo, useState } from "react";
import { addTourCostItemAction } from "@/modules/costing/actions/tour-costing";
import {
  estimatePackageCost,
  packageCostBasisLabels,
  packageNights,
  suggestedCostBasis,
} from "@/modules/packages/presentation";
import type { PackageCostTemplate } from "@/modules/packages/types";

const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";
const categories = ["Accommodation", "Activities", "Transport", "Meals", "Permits", "Guides", "Other"];
const bases = Object.keys(packageCostBasisLabels) as PackageCostTemplate["basis"][];

export function TourCostForm({
  tourId,
  durationDays,
  travellers,
  costingCurrencyCode,
  currencies,
  suppliers,
  itineraryDays,
}: {
  tourId: string;
  durationDays: number;
  travellers: number;
  costingCurrencyCode: string;
  currencies: { code: string }[];
  suppliers: { id: string; name: string }[];
  itineraryDays: { id: string; dayNumber: number; title: string }[];
}) {
  const [category, setCategory] = useState("Accommodation");
  const [basis, setBasis] = useState<PackageCostTemplate["basis"]>("ACCOMMODATION");
  const [unitCost, setUnitCost] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [days, setDays] = useState(String(durationDays));
  const [nights, setNights] = useState(String(Math.max(1, packageNights(durationDays))));
  const [rooms, setRooms] = useState("1");
  const [vehicles, setVehicles] = useState("1");
  const [people, setPeople] = useState(String(travellers));
  const [overrideTotal, setOverrideTotal] = useState("0");
  const [tax, setTax] = useState("0");
  const [commission, setCommission] = useState("0");
  const [currency, setCurrency] = useState(costingCurrencyCode);

  const preview = useMemo(() => estimatePackageCost({
    basis,
    unitCost,
    quantity,
    days,
    nights,
    rooms,
    vehicles,
    eligibleTravellers: people,
    taxPercentage: tax,
    commissionPercentage: commission,
    overrideTotal,
  }), [basis, commission, days, nights, overrideTotal, people, quantity, rooms, tax, unitCost, vehicles]);

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    setBasis(suggestedCostBasis(nextCategory));
  }

  return (
    <form action={addTourCostItemAction} className="grid gap-4 border-t p-5 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="tourId" value={tourId} />

      <label className="text-xs font-medium">
        What is the cost for?
        <select className={input} name="category" value={category} onChange={(event) => changeCategory(event.target.value)}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium sm:col-span-2">
        Description
        <input className={input} name="description" required placeholder="e.g. Two nights at Bwindi Forest Lodge" />
      </label>
      <label className="text-xs font-medium">
        Supplier
        <select className={input} name="supplierId">
          <option value="">Direct / not assigned</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </label>

      <label className="text-xs font-medium sm:col-span-2">
        How is this charged?
        <select className={input} name="basis" value={basis} onChange={(event) => setBasis(event.target.value as PackageCostTemplate["basis"])}>
          {bases.map((item) => <option key={item} value={item}>{packageCostBasisLabels[item]}</option>)}
        </select>
      </label>
      {basis !== "OVERRIDE" ? (
        <label className="text-xs font-medium">
          {basis === "ACCOMMODATION" ? "Rate per room/night" : basis === "PER_PERSON" ? "Rate per traveller" : basis === "VEHICLE" ? "Rate per vehicle/day" : "Unit cost"}
          <input className={input} name="unitCost" type="number" min={0} step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} required />
        </label>
      ) : <input type="hidden" name="unitCost" value="0" />}
      <label className="text-xs font-medium">
        Currency
        <select className={input} name="originalCurrencyCode" value={currency} onChange={(event) => setCurrency(event.target.value)}>
          {currencies.map((entry) => <option key={entry.code}>{entry.code}</option>)}
        </select>
      </label>

      {basis === "STANDARD" ? (
        <>
          <NumberField label="Number of items" name="quantity" value={quantity} onChange={setQuantity} />
          <NumberField label="Chargeable days" name="days" value={days} onChange={setDays} />
        </>
      ) : null}
      {basis === "ACCOMMODATION" ? (
        <>
          <NumberField label="Rooms" name="rooms" value={rooms} onChange={setRooms} whole />
          <NumberField label="Nights" name="nights" value={nights} onChange={setNights} whole />
        </>
      ) : null}
      {basis === "PER_PERSON" ? (
        <label className="text-xs font-medium sm:col-span-2">
          People charged
          <input className={input} name="eligibleTravellers" type="number" min={1} step="1" value={people} onChange={(event) => setPeople(event.target.value)} required />
          <span className="mt-1 block text-[11px] text-[#7b8580]">Filled from this tour&apos;s traveller count.</span>
        </label>
      ) : null}
      {basis === "VEHICLE" ? (
        <>
          <NumberField label="Vehicles" name="vehicles" value={vehicles} onChange={setVehicles} whole />
          <NumberField label="Chargeable days" name="days" value={days} onChange={setDays} whole />
        </>
      ) : null}
      {basis === "OVERRIDE" ? (
        <>
          <NumberField label="Manual total" name="overrideTotal" value={overrideTotal} onChange={setOverrideTotal} />
          <label className="text-xs font-medium sm:col-span-2">
            Why is a manual total needed?
            <input className={input} name="overrideReason" required />
          </label>
        </>
      ) : null}

      <div className="rounded-xl border border-[#b8cfc7] bg-[#f2f8f5] p-4 sm:col-span-2 lg:col-span-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#176b55]">Cost preview</p>
        <p className="mt-2 text-sm text-[#59635e]">
          {currency} {preview.formula}
          {preview.tax ? ` + ${tax}% tax` : ""}
          {preview.commission ? ` - ${commission}% commission` : ""}
        </p>
        <p className="mt-2 text-xl font-semibold">
          {currency} {preview.total.toLocaleString("en-UG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <details className="rounded-xl border bg-white sm:col-span-2 lg:col-span-4">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#176b55]">
          More options: itinerary day, rate date, tax and commission
        </summary>
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium">
            Itinerary day
            <select className={input} name="itineraryDayId">
              <option value="">Whole tour / not linked</option>
              {itineraryDays.map((day) => <option key={day.id} value={day.id}>Day {day.dayNumber}: {day.title}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium">
            Rate date
            <input className={input} name="exchangeRateDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <NumberField label="Tax %" name="taxPercentage" value={tax} onChange={setTax} allowZero />
          <NumberField label="Commission %" name="commissionPercentage" value={commission} onChange={setCommission} allowZero />
        </div>
      </details>

      <div className="lg:col-span-4">
        <button className="h-11 rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white">Add cost item</button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
  whole = false,
  allowZero = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  whole?: boolean;
  allowZero?: boolean;
}) {
  return (
    <label className="text-xs font-medium">
      {label}
      <input
        className={input}
        name={name}
        type="number"
        min={allowZero ? 0 : whole ? 1 : 0.01}
        step={whole ? 1 : 0.01}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}
