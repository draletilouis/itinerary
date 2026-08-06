"use client";

import { useMemo, useState } from "react";
import { addPackageCostAction } from "@/modules/packages/actions/packages";
import { estimatePackageCost, packageCostBasisLabels, packageNights, suggestedCostBasis, supplierRateBasis } from "@/modules/packages/presentation";
import type { PackageCostTemplate } from "@/modules/packages/types";
import { fieldClass, primaryButtonClass } from "@/components/ui/form-styles";
import { travellerPricingCategoryLabels } from "@/modules/costing/traveller-categories";
import { travellerRateBandEntries } from "@/modules/costing/traveller-categories";

const categories = ["Accommodation", "Activities", "Transport", "Meals", "Permits", "Guides", "Other"];
const bases = Object.keys(packageCostBasisLabels) as PackageCostTemplate["basis"][];
type Rate = { id: string; service: string; unit: string; amount: string | { toString(): string }; currencyCode: string; startDate: Date | string; endDate: Date | string | null; pricingCategory?: keyof typeof travellerPricingCategoryLabels | null; ageBand?: "ADULT" | "CHILD" | null };
type Supplier = { id: string; name: string; rates: Rate[] };

export function PackageCostForm({ packageId, durationDays, defaultTravellers, costingCurrencyCode, currencies, suppliers, itineraryDays }: {
  packageId: string; durationDays: number; defaultTravellers: number; costingCurrencyCode: string;
  currencies: { code: string }[]; suppliers: Supplier[]; itineraryDays: { dayNumber: number; title: string }[];
}) {
  const [category, setCategory] = useState("Accommodation");
  const [basis, setBasis] = useState<PackageCostTemplate["basis"]>("ACCOMMODATION");
  const [description, setDescription] = useState("");
  const [inclusionText, setInclusionText] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [rateId, setRateId] = useState("");
  const [unitCost, setUnitCost] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [days, setDays] = useState(String(durationDays));
  const [nights, setNights] = useState(String(Math.max(1, packageNights(durationDays))));
  const [rooms, setRooms] = useState("1");
  const [vehicles, setVehicles] = useState("1");
  const [travellers, setTravellers] = useState(String(defaultTravellers));
  const [overrideTotal, setOverrideTotal] = useState("0");
  const [tax, setTax] = useState("0");
  const [commission, setCommission] = useState("0");
  const [currency, setCurrency] = useState(costingCurrencyCode);
  const [classification, setClassification] = useState<PackageCostTemplate["classification"]>("INCLUDED");
  const [useTravellerRateBands, setUseTravellerRateBands] = useState(false);

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  const currentRates = (selectedSupplier?.rates ?? []).filter((rate) => {
    const now = new Date(); const start = new Date(rate.startDate); const end = rate.endDate ? new Date(rate.endDate) : null;
    return start <= now && (!end || end >= now);
  });
  const preview = useMemo(() => estimatePackageCost({ basis, unitCost, quantity, days, nights, rooms, vehicles, eligibleTravellers: travellers, taxPercentage: tax, commissionPercentage: commission, overrideTotal }), [basis, unitCost, quantity, days, nights, rooms, vehicles, travellers, tax, commission, overrideTotal]);

  function selectRate(id: string) {
    setRateId(id); const rate = currentRates.find((item) => item.id === id); if (!rate) return;
    setDescription(rate.service); setInclusionText(rate.service); setUnitCost(rate.amount.toString()); setCurrency(rate.currencyCode); setBasis(supplierRateBasis(rate.unit, category));
  }
  function changeCategory(value: string) { setCategory(value); if (!rateId) setBasis(suggestedCostBasis(value)); }

  return (
    <form action={addPackageCostAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="packageId" value={packageId} />
      <label className="text-xs font-medium">Cost category<select className={fieldClass} name="category" value={category} onChange={(event) => changeCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs font-medium">Supplier<select className={fieldClass} name="supplierId" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setRateId(""); }}><option value="">Direct / not assigned</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
      <label className="text-xs font-medium sm:col-span-2">Effective supplier rate<select className={fieldClass} name="supplierRateId" value={rateId} onChange={(event) => selectRate(event.target.value)}><option value="">Enter a rate manually</option>{currentRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.service}{rate.pricingCategory ? ` · ${travellerPricingCategoryLabels[rate.pricingCategory]} ${rate.ageBand?.toLowerCase() ?? ""}` : ""} · {rate.currencyCode} {rate.amount.toString()} / {rate.unit}</option>)}</select><span className="mt-1 block text-[11px] text-gray-500">Selecting a rate fills the description, currency, amount and charging method.</span></label>
      <label className="text-xs font-medium sm:col-span-2">Description<input className={fieldClass} name="description" required value={description} onChange={(event) => { setDescription(event.target.value); if (!inclusionText) setInclusionText(event.target.value); }} /></label>
      <label className="text-xs font-medium">Customer treatment<select className={fieldClass} name="classification" value={classification} onChange={(event) => setClassification(event.target.value as PackageCostTemplate["classification"])}><option value="INCLUDED">Included in base package</option><option value="OPTIONAL">Optional upgrade</option><option value="EXCLUDED">Excluded / reference only</option></select></label>
      {classification === "OPTIONAL" ? <label className="text-xs font-medium">Option group<input className={fieldClass} name="optionCode" defaultValue="TRANSPORT_INCLUDED" placeholder="TRANSPORT_INCLUDED" /></label> : <input type="hidden" name="optionCode" value="" />}
      <label className="text-xs font-medium sm:col-span-2">Customer inclusion wording<input className={fieldClass} name="inclusionText" value={inclusionText} onChange={(event) => setInclusionText(event.target.value)} placeholder="What the proposal should say is included" /></label>
      <label className="text-xs font-medium sm:col-span-2">How is it charged?<select className={fieldClass} name="basis" value={basis} onChange={(event) => setBasis(event.target.value as PackageCostTemplate["basis"])}>{bases.map((item) => <option key={item} value={item}>{packageCostBasisLabels[item]}</option>)}</select></label>
      {basis.startsWith("PER_PERSON") ? <label className="flex items-center gap-2 rounded-lg border p-3 text-xs font-medium sm:col-span-2"><input type="checkbox" name="useTravellerRateBands" value="true" checked={useTravellerRateBands} onChange={(event) => setUseTravellerRateBands(event.target.checked)} />Use Ugandan, foreigner, resident foreigner and East African rates</label> : null}
      {useTravellerRateBands && basis.startsWith("PER_PERSON") ? <div className="grid gap-3 rounded-lg border bg-[#f9fafb] p-4 sm:col-span-2 lg:col-span-4 sm:grid-cols-2 lg:grid-cols-3"><p className="text-xs text-gray-600 sm:col-span-2 lg:col-span-3">Enter each applicable rate. Leave an amount blank when that band is not offered.</p>{travellerRateBandEntries.map(({ pricingCategory, ageBand, label, rateFieldName, currencyFieldName }) => <div key={pricingCategory + "-" + ageBand} className="rounded-lg border bg-white p-3"><p className="text-xs font-semibold">{label}</p><div className="mt-2 grid grid-cols-[1fr_90px] gap-2"><input className={fieldClass} name={rateFieldName} type="number" min="0" step="0.01" placeholder="Rate" /><select className={fieldClass} name={currencyFieldName} defaultValue={currency}>{currencies.map((entry) => <option key={entry.code}>{entry.code}</option>)}</select></div></div>)}</div> : null}
      {basis !== "OVERRIDE" && !useTravellerRateBands ? <label className="text-xs font-medium">Unit rate<input className={fieldClass} name="unitCost" type="number" min={0} step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} required /></label> : <input type="hidden" name="unitCost" value="0" />}
      <label className="text-xs font-medium">Currency<select className={fieldClass} name="originalCurrencyCode" value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map((entry) => <option key={entry.code}>{entry.code}</option>)}</select></label>
      {basis === "STANDARD" ? <><label className="text-xs font-medium">Units<input className={fieldClass} name="quantity" type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label className="text-xs font-medium">Chargeable days<input className={fieldClass} name="days" type="number" min="0.01" step="0.01" value={days} onChange={(event) => setDays(event.target.value)} /></label></> : null}
      {basis === "ACCOMMODATION" ? <><label className="text-xs font-medium">Rooms<input className={fieldClass} name="rooms" type="number" min="1" value={rooms} onChange={(event) => setRooms(event.target.value)} /></label><label className="text-xs font-medium">Nights<input className={fieldClass} name="nights" type="number" min="1" value={nights} onChange={(event) => setNights(event.target.value)} /></label></> : null}
      {basis.startsWith("PER_PERSON") && !useTravellerRateBands ? <label className="text-xs font-medium">People charged<input className={fieldClass} name="eligibleTravellers" type="number" min="1" value={travellers} onChange={(event) => setTravellers(event.target.value)} /></label> : basis.startsWith("PER_PERSON") ? <input type="hidden" name="eligibleTravellers" value="0" /> : null}
      {basis === "PER_PERSON_PER_NIGHT" ? <label className="text-xs font-medium">Nights<input className={fieldClass} name="nights" type="number" min="1" value={nights} onChange={(event) => setNights(event.target.value)} /></label> : null}
      {basis === "PER_PERSON_PER_DAY" ? <label className="text-xs font-medium">Chargeable days<input className={fieldClass} name="days" type="number" min="1" value={days} onChange={(event) => setDays(event.target.value)} /></label> : null}
      {basis === "VEHICLE" ? <><label className="text-xs font-medium">Vehicles<input className={fieldClass} name="vehicles" type="number" min="1" value={vehicles} onChange={(event) => setVehicles(event.target.value)} /></label><label className="text-xs font-medium">Chargeable days<input className={fieldClass} name="days" type="number" min="1" value={days} onChange={(event) => setDays(event.target.value)} /></label></> : null}
      {basis === "OVERRIDE" ? <><label className="text-xs font-medium">Manual total<input className={fieldClass} name="overrideTotal" type="number" min="0" value={overrideTotal} onChange={(event) => setOverrideTotal(event.target.value)} /></label><label className="text-xs font-medium sm:col-span-2">Override reason<input className={fieldClass} name="overrideReason" required /></label></> : null}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:col-span-2 lg:col-span-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#011478]">Calculated cost</p><p className="mt-2 text-sm text-gray-600">{currency} {preview.formula}</p><p className="mt-2 text-xl font-semibold">{currency} {preview.total.toLocaleString("en-UG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
      <details className="rounded-lg border bg-white sm:col-span-2 lg:col-span-4"><summary className="px-4 py-3 text-sm font-semibold text-[#011478]">More options</summary><div className="grid gap-4 border-t p-4 sm:grid-cols-3"><label className="text-xs font-medium">Itinerary day<select className={fieldClass} name="dayNumber"><option value="">Whole package</option>{itineraryDays.map((day) => <option key={day.dayNumber} value={day.dayNumber}>Day {day.dayNumber}: {day.title}</option>)}</select></label><label className="text-xs font-medium">Tax %<input className={fieldClass} name="taxPercentage" type="number" min="0" value={tax} onChange={(event) => setTax(event.target.value)} /></label><label className="text-xs font-medium">Commission %<input className={fieldClass} name="commissionPercentage" type="number" min="0" value={commission} onChange={(event) => setCommission(event.target.value)} /></label></div></details>
      <div className="lg:col-span-4"><button className={primaryButtonClass}>Add package cost</button></div>
    </form>
  );
}





