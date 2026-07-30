import { Prisma } from "@prisma/client";
import type { DecimalValue } from "@/modules/costing/types";

const D = (value: DecimalValue = 0) => new Prisma.Decimal(value);
const ZERO = D(0);

export type QuotationPresentationModeValue = "ITEMIZED" | "PER_TRAVELLER" | "BOTH";

export type ItineraryQuotationItem = {
  id: string;
  dayNumber: number;
  sortOrder: number;
  type: string;
  title: string;
  linkedCost: DecimalValue;
};

export type QuotationPresentationLine = {
  sortOrder: number;
  description: string;
  details: string | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  total: Prisma.Decimal;
};

function currencyAmount(value: DecimalValue) {
  return D(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function allocateQuotationAmount(totalValue: DecimalValue, weights: DecimalValue[]) {
  const total = currencyAmount(totalValue);
  if (!weights.length) return [];
  const normalized = weights.map((weight) => Prisma.Decimal.max(D(weight), ZERO));
  const weightTotal = normalized.reduce((sum, weight) => sum.plus(weight), ZERO);
  const effective = weightTotal.isZero() ? normalized.map(() => D(1)) : normalized;
  const effectiveTotal = effective.reduce((sum, weight) => sum.plus(weight), ZERO);
  let remaining = total;

  return effective.map((weight, index) => {
    if (index === effective.length - 1) return remaining;
    const share = total.mul(weight).div(effectiveTotal).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const allocated = Prisma.Decimal.min(share, remaining);
    remaining = remaining.minus(allocated);
    return allocated;
  });
}

function itemTypeLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function buildItineraryQuotationLines(input: {
  total: DecimalValue;
  items: ItineraryQuotationItem[];
  fallbackTitle: string;
}): QuotationPresentationLine[] {
  const ordered = [...input.items].sort(
    (left, right) => left.dayNumber - right.dayNumber || left.sortOrder - right.sortOrder,
  );
  const priced = ordered.filter((item) => D(item.linkedCost).greaterThan(0));
  const allocations = allocateQuotationAmount(
    input.total,
    priced.map((item) => item.linkedCost),
  );
  const allocationById = new Map(priced.map((item, index) => [item.id, allocations[index]]));
  const lines = ordered.map((item, index) => {
    const amount = allocationById.get(item.id) ?? ZERO;
    return {
      sortOrder: index + 1,
      description: item.title,
      details: `Day ${item.dayNumber} · ${itemTypeLabel(item.type)}`,
      quantity: D(1),
      unitPrice: amount,
      total: amount,
    };
  });

  if (!priced.length) {
    const amount = currencyAmount(input.total);
    lines.push({
      sortOrder: lines.length + 1,
      description: input.fallbackTitle,
      details: "Tour services and arrangements",
      quantity: D(1),
      unitPrice: amount,
      total: amount,
    });
  }
  return lines;
}

export type TravellerPricing = {
  adultUnitPrice: Prisma.Decimal | null;
  childUnitPrice: Prisma.Decimal | null;
  adjustment: Prisma.Decimal;
};

export function buildTravellerPricing(input: {
  total: DecimalValue;
  adults: number;
  children: number;
  adultUnitPrice?: DecimalValue | null;
  childUnitPrice?: DecimalValue | null;
}): TravellerPricing {
  if (!Number.isInteger(input.adults) || input.adults < 0 || !Number.isInteger(input.children) || input.children < 0) {
    throw new Error("Traveller counts must be whole non-negative numbers.");
  }
  const travellers = input.adults + input.children;
  if (!travellers) throw new Error("Add at least one traveller before generating a quotation.");
  const total = currencyAmount(input.total);
  const hasCustomAdult = input.adultUnitPrice !== null && input.adultUnitPrice !== undefined && String(input.adultUnitPrice) !== "";
  const hasCustomChild = input.childUnitPrice !== null && input.childUnitPrice !== undefined && String(input.childUnitPrice) !== "";
  const hasCustom = hasCustomAdult || hasCustomChild;

  if (hasCustom) {
    if (input.adults > 0 && !hasCustomAdult) throw new Error("Enter the price per adult.");
    if (input.children > 0 && !hasCustomChild) throw new Error("Enter the price per child.");
    const adult = input.adults > 0 ? currencyAmount(input.adultUnitPrice ?? 0) : null;
    const child = input.children > 0 ? currencyAmount(input.childUnitPrice ?? 0) : null;
    if (adult?.isNegative() || child?.isNegative()) throw new Error("Traveller prices cannot be negative.");
    const customTotal = (adult ?? ZERO).mul(input.adults).plus((child ?? ZERO).mul(input.children));
    if (!customTotal.equals(total)) {
      throw new Error(`Per-traveller prices must add up to the quotation total (${total.toFixed(2)}).`);
    }
    return { adultUnitPrice: adult, childUnitPrice: child, adjustment: ZERO };
  }

  const unit = total.div(travellers).toDecimalPlaces(2, Prisma.Decimal.ROUND_FLOOR);
  return {
    adultUnitPrice: input.adults > 0 ? unit : null,
    childUnitPrice: input.children > 0 ? unit : null,
    adjustment: total.minus(unit.mul(travellers)),
  };
}

export function getTravellerPricingRows(input: {
  total: DecimalValue;
  adults: number;
  children: number;
  adultUnitPrice: DecimalValue | null;
  childUnitPrice: DecimalValue | null;
  adjustment: DecimalValue;
}) {
  const missingStoredPrices =
    (input.adults > 0 && input.adultUnitPrice === null) ||
    (input.children > 0 && input.childUnitPrice === null);
  const pricing = missingStoredPrices
    ? buildTravellerPricing({ total: input.total, adults: input.adults, children: input.children })
    : {
        adultUnitPrice: input.adultUnitPrice === null ? null : D(input.adultUnitPrice),
        childUnitPrice: input.childUnitPrice === null ? null : D(input.childUnitPrice),
        adjustment: D(input.adjustment),
      };
  const adjustment = pricing.adjustment;
  const adjustmentTarget = input.children > 0 ? "child" : "adult";
  const rows: Array<{
    type: "adult" | "child";
    label: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    adjustment: Prisma.Decimal;
    total: Prisma.Decimal;
  }> = [];
  if (input.adults > 0 && pricing.adultUnitPrice !== null) {
    const unitPrice = pricing.adultUnitPrice;
    const rowAdjustment = adjustmentTarget === "adult" ? adjustment : ZERO;
    rows.push({
      type: "adult",
      label: input.adults === 1 ? "Adult traveller" : "Adult travellers",
      quantity: input.adults,
      unitPrice,
      adjustment: rowAdjustment,
      total: unitPrice.mul(input.adults).plus(rowAdjustment),
    });
  }
  if (input.children > 0 && pricing.childUnitPrice !== null) {
    const unitPrice = pricing.childUnitPrice;
    const rowAdjustment = adjustmentTarget === "child" ? adjustment : ZERO;
    rows.push({
      type: "child",
      label: input.children === 1 ? "Child traveller" : "Child travellers",
      quantity: input.children,
      unitPrice,
      adjustment: rowAdjustment,
      total: unitPrice.mul(input.children).plus(rowAdjustment),
    });
  }
  return rows;
}