import { z } from "zod";

const money = z.union([z.string(), z.number()]).transform(String).refine((value) => /^-?\d+(\.\d+)?$/.test(value), "Enter a valid decimal amount.");
const nonNegative = money.refine((value) => !value.startsWith("-"), "Amount cannot be negative.");

export const pricingInputSchema = z.object({
  internalCost: nonNegative,
  travellerCount: nonNegative,
  tourDays: nonNegative.optional().default("0"),
  contingencyMethod: z.enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON", "PER_DAY"]).default("NONE"),
  contingencyValue: nonNegative.optional().default("0"),
  markupMethod: z.enum(["PERCENTAGE", "FIXED", "PER_PERSON", "CATEGORY", "TARGET_PRICE", "TARGET_MARGIN"]),
  markupValue: nonNegative.optional().default("0"),
  taxMethod: z.enum(["NONE", "PERCENTAGE", "FIXED"]).default("NONE"),
  taxValue: nonNegative.optional().default("0"),
  discountMethod: z.enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON"]).default("NONE"),
  discountValue: nonNegative.optional().default("0"),
  minimumMargin: nonNegative.optional().default("0"),
});

export type PricingFormInput = z.input<typeof pricingInputSchema>;
