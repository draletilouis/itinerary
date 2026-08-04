import { formatMoney } from "@/lib/utils";

type CostItemDisplayInput = {
  basis: "STANDARD" | "ACCOMMODATION" | "PER_PERSON" | "PER_PERSON_PER_NIGHT" | "PER_PERSON_PER_DAY" | "VEHICLE" | "OVERRIDE";
  unitCost: { toString(): string };
  quantity: { toString(): string };
  days: { toString(): string };
  nights: { toString(): string };
  rooms: { toString(): string };
  vehicles: { toString(): string };
  eligibleTravellers: { toString(): string };
  overrideTotal: { toString(): string } | null;
  originalCurrencyCode: string;
  convertedCurrencyCode: string;
  exchangeRate: { toString(): string };
};

const count = (value: { toString(): string }) =>
  Number(value.toString()).toLocaleString("en-UG", { maximumFractionDigits: 2 });

export function costItemDisplay(item: CostItemDisplayInput) {
  const unit = formatMoney(item.unitCost.toString(), item.originalCurrencyCode);
  let formula: string;
  let basisLabel: string;

  switch (item.basis) {
    case "ACCOMMODATION":
      basisLabel = "Per room per night";
      formula = `${unit} × ${count(item.rooms)} room(s) × ${count(item.nights)} night(s)`;
      break;
    case "PER_PERSON":
      basisLabel = "Per traveller";
      formula = `${unit} × ${count(item.eligibleTravellers)} traveller(s)`;
      break;
    case "PER_PERSON_PER_NIGHT":
      basisLabel = "Per traveller per night";
      formula = `${unit} x ${count(item.eligibleTravellers)} traveller(s) x ${count(item.nights)} night(s)`;
      break;
    case "PER_PERSON_PER_DAY":
      basisLabel = "Per traveller per day";
      formula = `${unit} x ${count(item.eligibleTravellers)} traveller(s) x ${count(item.days)} day(s)`;
      break;
    case "VEHICLE":
      basisLabel = "Per vehicle per day";
      formula = `${unit} × ${count(item.vehicles)} vehicle(s) × ${count(item.days)} day(s)`;
      break;
    case "OVERRIDE":
      basisLabel = "Manual total";
      formula = `Manual total ${formatMoney(item.overrideTotal?.toString() ?? "0", item.originalCurrencyCode)}`;
      break;
    default:
      basisLabel = "Per item or day";
      formula = `${unit} × ${count(item.quantity)} item(s) × ${count(item.days)} day(s)`;
  }

  const sameCurrency = item.originalCurrencyCode === item.convertedCurrencyCode;
  return {
    basisLabel,
    formula,
    sameCurrency,
    conversionLabel: sameCurrency
      ? "No conversion"
      : `1 ${item.originalCurrencyCode} = ${Number(item.exchangeRate.toString()).toLocaleString("en-UG", { maximumFractionDigits: 6 })} ${item.convertedCurrencyCode}`,
    conversionDetail: sameCurrency
      ? `${item.originalCurrencyCode} → ${item.convertedCurrencyCode}`
      : `${item.originalCurrencyCode} → ${item.convertedCurrencyCode}`,
  };
}
