import type { Prisma } from "@prisma/client";

export type DecimalValue = Prisma.Decimal.Value;
export type CalculationBasis = "STANDARD" | "ACCOMMODATION" | "PER_PERSON" | "PER_PERSON_PER_NIGHT" | "PER_PERSON_PER_DAY" | "VEHICLE" | "OVERRIDE";
export type AdjustmentMethod = "NONE" | "PERCENTAGE" | "FIXED" | "PER_PERSON" | "PER_DAY";
export type MarkupMethod = "PERCENTAGE" | "FIXED" | "PER_PERSON" | "CATEGORY" | "TARGET_PRICE" | "TARGET_MARGIN";

export type CostItemInput = {
  category: string;
  unitCost: DecimalValue;
  quantity?: DecimalValue;
  days?: DecimalValue;
  nights?: DecimalValue;
  rooms?: DecimalValue;
  vehicles?: DecimalValue;
  eligibleTravellers?: DecimalValue;
  taxPercentage?: DecimalValue;
  commissionPercentage?: DecimalValue;
  exchangeRate?: DecimalValue;
  basis: CalculationBasis;
  overrideTotal?: DecimalValue;
  overrideReason?: string;
};

export type PricingInput = {
  internalCost: DecimalValue;
  travellerCount: DecimalValue;
  tourDays?: DecimalValue;
  contingencyMethod?: AdjustmentMethod;
  contingencyValue?: DecimalValue;
  markupMethod: MarkupMethod;
  markupValue?: DecimalValue;
  categoryCosts?: { category: string; amount: DecimalValue; markupPercentage: DecimalValue }[];
  taxMethod?: "NONE" | "PERCENTAGE" | "FIXED";
  taxValue?: DecimalValue;
  discountMethod?: "NONE" | "PERCENTAGE" | "FIXED" | "PER_PERSON";
  discountValue?: DecimalValue;
  minimumMargin?: DecimalValue;
};
