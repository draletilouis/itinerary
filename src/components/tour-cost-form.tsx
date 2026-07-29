"use client";

import { useMemo, useState } from "react";
import { addTourCostItemAction } from "@/modules/costing/actions/tour-costing";
import {
  estimatePackageCost,
  packageCostBasisLabels,
  packageNights,
  suggestedCostBasis,
  supplierRateBasis,
} from "@/modules/packages/presentation";
import type { PackageCostTemplate } from "@/modules/packages/types";
import { roomsRequired } from "@/modules/costing/presentation/rooms";

const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";
const categories = ["Accommodation", "Activities", "Transport", "Meals", "Permits", "Guides", "Other"];
const bases = Object.keys(packageCostBasisLabels) as PackageCostTemplate["basis"][];

type RoomRateOption = {
  id: string; accommodationName: string; roomTypeName: string; maximumOccupancy: number;
  occupancyGuests: number; mealPlan: string; amount: string; currencyCode: string;
  startDate: string; endDate: string | null;
};
type ServiceRateOption = {
  id: string; service: string; unit: string; amount: string; currencyCode: string;
  startDate: string; endDate: string | null; notes: string | null;
};
type SupplierOption = { id: string; name: string; serviceRates: ServiceRateOption[]; roomRates: RoomRateOption[] };

export function TourCostForm({
  tourId,
  durationDays,
  travellers,
  costingCurrencyCode,
  currencies,
  suppliers,
  itineraryDays,
  tourStartDate,
}: {
  tourId: string;
  durationDays: number;
  travellers: number;
  costingCurrencyCode: string;
  currencies: { code: string }[];
  suppliers: SupplierOption[];
  itineraryDays: { id: string; dayNumber: number; title: string }[];
  tourStartDate: string;
}) {
  const [category, setCategory] = useState("Accommodation");
  const [description, setDescription] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [roomRateId, setRoomRateId] = useState("");
  const [serviceRateId, setServiceRateId] = useState("");
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

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  const roomRates = (selectedSupplier?.roomRates ?? []).filter((rate) => {
    const date = new Date(tourStartDate);
    return new Date(rate.startDate) <= date && (!rate.endDate || new Date(rate.endDate) >= date);
  });
  const selectedRoomRate = roomRates.find((rate) => rate.id === roomRateId);
  const serviceRates = (selectedSupplier?.serviceRates ?? []).filter((rate) => {
    const date = new Date(tourStartDate);
    return new Date(rate.startDate) <= date && (!rate.endDate || new Date(rate.endDate) >= date);
  });
  const selectedServiceRate = serviceRates.find((rate) => rate.id === serviceRateId);

  function selectRoomRate(nextRateId: string) {
    setRoomRateId(nextRateId);
    const rate = roomRates.find((entry) => entry.id === nextRateId);
    if (!rate) return;
    setBasis("ACCOMMODATION");
    setUnitCost(rate.amount);
    setCurrency(rate.currencyCode);
    setRooms(String(roomsRequired(travellers, rate.occupancyGuests)));
    setDescription(`${rate.accommodationName} - ${rate.roomTypeName} (${rate.mealPlan})`);
  }
  function selectServiceRate(nextRateId: string, availableRates = serviceRates) {
    setServiceRateId(nextRateId);
    const rate = availableRates.find((entry) => entry.id === nextRateId);
    if (!rate) return;
    setBasis(supplierRateBasis(rate.unit, category));
    setUnitCost(rate.amount);
    setCurrency(rate.currencyCode);
    setDescription(rate.service);
  }

  function changeSupplier(nextSupplierId: string) {
    setSupplierId(nextSupplierId);
    setRoomRateId("");
    setServiceRateId("");
    if (category === "Accommodation") return;
    const nextSupplier = suppliers.find((supplier) => supplier.id === nextSupplierId);
    const date = new Date(tourStartDate);
    const activeRates = (nextSupplier?.serviceRates ?? []).filter(
      (rate) => new Date(rate.startDate) <= date && (!rate.endDate || new Date(rate.endDate) >= date),
    );
    if (activeRates.length === 1) selectServiceRate(activeRates[0].id, activeRates);
  }

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
    setRoomRateId("");
    setServiceRateId("");
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
        <input className={input} name="description" value={description} onChange={(event) => setDescription(event.target.value)} required placeholder="e.g. Two nights at Bwindi Forest Lodge" />
      </label>
      <label className="text-xs font-medium">
        Supplier
        <select className={input} name="supplierId" value={supplierId} onChange={(event) => changeSupplier(event.target.value)}>
          <option value="">Direct / not assigned</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </label>

      {category === "Accommodation" && supplierId ? (
        <div className="rounded-xl border bg-white p-4 sm:col-span-2 lg:col-span-4">
          <label className="text-xs font-medium">
            Supplier room and rate
            <select className={input} value={roomRateId} onChange={(event) => selectRoomRate(event.target.value)}>
              <option value="">Select a room rate</option>
              {roomRates.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.accommodationName} - {rate.roomTypeName} - {rate.occupancyGuests} guest(s) - {rate.mealPlan} - {rate.currencyCode} {rate.amount} per room/night
                </option>
              ))}
            </select>
          </label>
          {selectedRoomRate ? (
            <div className="mt-3 grid gap-2 rounded-lg bg-[#f2f8f5] p-3 text-xs sm:grid-cols-3">
              <p><span className="font-semibold">Capacity:</span> {selectedRoomRate.occupancyGuests} guest(s) per room</p>
              <p><span className="font-semibold">Tour guests:</span> {travellers}</p>
              <p><span className="font-semibold">Rooms required:</span> {rooms}</p>
            </div>
          ) : roomRates.length ? (
            <p className="mt-2 text-xs text-[#68736e]">Select the contracted room rate to fill the amount, currency and required rooms.</p>
          ) : (
            <p className="mt-2 text-xs text-amber-700">This supplier has no accommodation room rate covering the tour start date. Add one under Settings - Catalogue.</p>
          )}
        </div>
      ) : null}

      {category !== "Accommodation" && supplierId ? (
        <div className="rounded-xl border bg-white p-4 sm:col-span-2 lg:col-span-4">
          <label className="text-xs font-medium">
            Supplier service and rate
            <select className={input} value={serviceRateId} onChange={(event) => selectServiceRate(event.target.value)}>
              <option value="">Select a predefined supplier rate</option>
              {serviceRates.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.service} - per {rate.unit} - {rate.currencyCode} {rate.amount}
                </option>
              ))}
            </select>
          </label>
          {selectedServiceRate ? (
            <p className="mt-2 text-xs text-[#176b55]">
              Filled from the supplier rate: {selectedServiceRate.currencyCode} {selectedServiceRate.amount} per {selectedServiceRate.unit}.
            </p>
          ) : serviceRates.length ? (
            <p className="mt-2 text-xs text-[#68736e]">Select a rate to fill the service, charging method, amount and currency.</p>
          ) : (
            <p className="mt-2 text-xs text-amber-700">This supplier has no active general service rate covering the tour start date.</p>
          )}
        </div>
      ) : null}


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
