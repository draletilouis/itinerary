import { Prisma } from "@prisma/client";
import type { DecimalValue } from "@/modules/costing/types";
import { calculateProfitMargin } from "@/modules/costing/services/pricing";

const D = (value: DecimalValue) => new Prisma.Decimal(value);

export function calculateQuotationRevision(input: {
  subtotal: DecimalValue;
  tax: DecimalValue;
  discount: DecimalValue;
  internalCost: DecimalValue;
}) {
  const subtotal = D(input.subtotal);
  const tax = D(input.tax);
  const discount = D(input.discount);
  const internalCost = D(input.internalCost);
  for (const [name, value] of [
    ["Subtotal", subtotal],
    ["Tax", tax],
    ["Discount", discount],
    ["Internal cost", internalCost],
  ] as const) {
    if (value.isNegative()) throw new Error(`${name} cannot be negative.`);
  }
  if (discount.greaterThan(subtotal.plus(tax))) {
    throw new Error("Discount cannot exceed the quotation amount.");
  }
  const total = subtotal.plus(tax).minus(discount);
  const estimatedProfit = total.minus(internalCost);
  const estimatedMargin = calculateProfitMargin(estimatedProfit, total);
  return { subtotal, tax, discount, total, internalCost, estimatedProfit, estimatedMargin };
}
