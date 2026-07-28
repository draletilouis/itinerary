"use server";

import { pricingInputSchema, type PricingFormInput } from "../schemas/pricing";
import { calculateSellingPrice, serializePricing } from "../services/pricing";

export async function calculatePricingAction(input: PricingFormInput) {
  const parsed = pricingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid pricing input." };
  try {
    return { ok: true as const, data: serializePricing(calculateSellingPrice(parsed.data)) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Pricing calculation failed." };
  }
}
