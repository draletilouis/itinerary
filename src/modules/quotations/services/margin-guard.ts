import { Prisma } from "@prisma/client";

export function quotationNeedsZeroMarginOverride(input: { internalCost: Prisma.Decimal.Value; sellingPrice: Prisma.Decimal.Value; estimatedMargin: Prisma.Decimal.Value }) {
  const internalCost = new Prisma.Decimal(input.internalCost);
  const sellingPrice = new Prisma.Decimal(input.sellingPrice);
  const estimatedMargin = new Prisma.Decimal(input.estimatedMargin);
  return sellingPrice.lessThanOrEqualTo(internalCost) || estimatedMargin.lessThanOrEqualTo(0);
}

export function validateZeroMarginOverride(input: Parameters<typeof quotationNeedsZeroMarginOverride>[0], reason: string) {
  if (quotationNeedsZeroMarginOverride(input) && reason.trim().length < 10) {
    throw new Error("This quotation has no profit. Enter a clear override reason before continuing.");
  }
}
