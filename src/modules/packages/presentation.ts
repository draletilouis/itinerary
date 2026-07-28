import type { PackageCostTemplate } from "./types";

export function packageNights(durationDays: number) {
  return Math.max(Math.trunc(durationDays) - 1, 0);
}

export const packageCostBasisLabels: Record<PackageCostTemplate["basis"], string> = {
  STANDARD: "Per item or day",
  ACCOMMODATION: "Per room per night",
  PER_PERSON: "Per traveller",
  VEHICLE: "Per vehicle per day",
  OVERRIDE: "Enter total manually",
};

export function suggestedCostBasis(category: string): PackageCostTemplate["basis"] {
  if (category === "Accommodation") return "ACCOMMODATION";
  if (category === "Transport") return "VEHICLE";
  if (["Activities", "Meals", "Permits"].includes(category)) return "PER_PERSON";
  return "STANDARD";
}

const numeric = (value: string | number | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function estimatePackageCost(
  cost: Pick<
    PackageCostTemplate,
    | "basis"
    | "unitCost"
    | "quantity"
    | "days"
    | "nights"
    | "rooms"
    | "vehicles"
    | "eligibleTravellers"
    | "taxPercentage"
    | "commissionPercentage"
    | "overrideTotal"
  >,
) {
  const unitCost = numeric(cost.unitCost);
  let subtotal = 0;
  let formula = "";

  switch (cost.basis) {
    case "ACCOMMODATION":
      subtotal = unitCost * numeric(cost.rooms) * numeric(cost.nights);
      formula = `${unitCost} × ${numeric(cost.rooms)} rooms × ${numeric(cost.nights)} nights`;
      break;
    case "PER_PERSON":
      subtotal = unitCost * numeric(cost.eligibleTravellers);
      formula = `${unitCost} × ${numeric(cost.eligibleTravellers)} travellers`;
      break;
    case "VEHICLE":
      subtotal = unitCost * numeric(cost.vehicles) * numeric(cost.days);
      formula = `${unitCost} × ${numeric(cost.vehicles)} vehicles × ${numeric(cost.days)} days`;
      break;
    case "OVERRIDE":
      subtotal = numeric(cost.overrideTotal);
      formula = `Manual total ${subtotal}`;
      break;
    default:
      subtotal = unitCost * numeric(cost.quantity) * numeric(cost.days);
      formula = `${unitCost} × ${numeric(cost.quantity)} units × ${numeric(cost.days)} days`;
  }

  const tax = subtotal * (numeric(cost.taxPercentage) / 100);
  const commission = subtotal * (numeric(cost.commissionPercentage) / 100);
  return {
    subtotal,
    tax,
    commission,
    total: subtotal + tax - commission,
    formula,
  };
}
