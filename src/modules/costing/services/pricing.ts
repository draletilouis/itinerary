import { Prisma } from "@prisma/client";
import type { CostItemInput, DecimalValue, PricingInput } from "../types";

const D = (value: DecimalValue = 0) => new Prisma.Decimal(value);
const ZERO = D(0);
const HUNDRED = D(100);

function assertNonNegative(name: string, value: Prisma.Decimal) {
  if (value.isNegative()) throw new Error(`${name} cannot be negative.`);
}

function percent(amount: DecimalValue, percentage: DecimalValue) {
  const enteredPercentage = D(percentage);
  assertNonNegative("Percentage", enteredPercentage);
  return D(amount).mul(enteredPercentage).div(HUNDRED);
}

export function calculateCostItem(input: CostItemInput) {
  const unitCost = D(input.unitCost);
  const quantity = D(input.quantity ?? 1);
  assertNonNegative("Unit cost", unitCost);
  assertNonNegative("Quantity", quantity);

  let originalSubtotal: Prisma.Decimal;
  switch (input.basis) {
    case "ACCOMMODATION":
      originalSubtotal = unitCost.mul(D(input.rooms ?? 0)).mul(D(input.nights ?? 0));
      break;
    case "PER_PERSON":
      originalSubtotal = unitCost.mul(D(input.eligibleTravellers ?? 0));
      break;
    case "PER_PERSON_PER_NIGHT":
      originalSubtotal = unitCost.mul(D(input.eligibleTravellers ?? 0)).mul(D(input.nights ?? 0));
      break;
    case "PER_PERSON_PER_DAY":
      originalSubtotal = unitCost.mul(D(input.eligibleTravellers ?? 0)).mul(D(input.days ?? 0));
      break;
    case "VEHICLE":
      originalSubtotal = unitCost.mul(D(input.vehicles ?? 0)).mul(D(input.days ?? 0));
      break;
    case "OVERRIDE":
      if (input.overrideTotal === undefined) throw new Error("An override total is required.");
      if (!input.overrideReason?.trim()) throw new Error("An override reason is required.");
      originalSubtotal = D(input.overrideTotal);
      break;
    default:
      originalSubtotal = unitCost.mul(quantity).mul(D(input.days ?? 1));
  }

  assertNonNegative("Cost total", originalSubtotal);
  const tax = percent(originalSubtotal, input.taxPercentage ?? 0);
  const commission = percent(originalSubtotal, input.commissionPercentage ?? 0);
  const originalTotal = originalSubtotal.plus(tax).minus(commission);
  const exchangeRate = D(input.exchangeRate ?? 1);
  assertNonNegative("Exchange rate", exchangeRate);
  return { originalSubtotal, tax, commission, originalTotal, baseCurrencyTotal: originalTotal.mul(exchangeRate) };
}

export function convertCurrency(originalAmount: DecimalValue, exchangeRate: DecimalValue) {
  const amount = D(originalAmount);
  const rate = D(exchangeRate);
  assertNonNegative("Original amount", amount);
  if (!rate.isPositive()) throw new Error("Exchange rate must be greater than zero.");
  return amount.mul(rate);
}

export function calculateTourCost(items: CostItemInput[]) {
  return items.reduce((total, item) => total.plus(calculateCostItem(item).baseCurrencyTotal), D(0));
}

export function calculateContingency(cost: DecimalValue, method: PricingInput["contingencyMethod"] = "NONE", value: DecimalValue = 0, travellers: DecimalValue = 0, days: DecimalValue = 0) {
  const base = D(cost); const adjustment = D(value);
  switch (method) {
    case "PERCENTAGE": return percent(base, adjustment);
    case "FIXED": return adjustment;
    case "PER_PERSON": return adjustment.mul(D(travellers));
    case "PER_DAY": return adjustment.mul(D(days));
    default: return D(0);
  }
}

export function applyPercentageMarkup(cost: DecimalValue, percentage: DecimalValue) { return percent(cost, percentage); }
export function applyFixedMarkup(_cost: DecimalValue, fixedAmount: DecimalValue) { return D(fixedAmount); }
export function applyPerPersonMarkup(perPersonAmount: DecimalValue, travellers: DecimalValue) { return D(perPersonAmount).mul(D(travellers)); }

export function applyCategoryMarkup(items: NonNullable<PricingInput["categoryCosts"]>) {
  return items.reduce((total, item) => total.plus(percent(item.amount, item.markupPercentage)), D(0));
}

export function sellingPriceForTargetMargin(cost: DecimalValue, targetMargin: DecimalValue) {
  const margin = D(targetMargin);
  if (margin.isNegative() || margin.greaterThanOrEqualTo(100)) throw new Error("Target margin must be between 0 and 100 percent.");
  return D(cost).div(D(1).minus(margin.div(HUNDRED)));
}

export function impliedMarkupForTargetPrice(cost: DecimalValue, targetPrice: DecimalValue) {
  const markup = D(targetPrice).minus(D(cost));
  if (markup.isNegative()) throw new Error("Target selling price cannot be below cost without an authorised discount workflow.");
  return markup;
}

export function calculateMarkupPercentage(profit: DecimalValue, cost: DecimalValue) {
  return D(cost).isZero() ? ZERO : D(profit).div(D(cost)).mul(HUNDRED);
}

export function calculateProfit(sellingPrice: DecimalValue, cost: DecimalValue) { return D(sellingPrice).minus(D(cost)); }

export function calculateProfitMargin(profit: DecimalValue, sellingPrice: DecimalValue) {
  return D(sellingPrice).isZero() ? ZERO : D(profit).div(D(sellingPrice)).mul(HUNDRED);
}

export function applyDiscount(price: DecimalValue, method: PricingInput["discountMethod"] = "NONE", value: DecimalValue = 0, travellers: DecimalValue = 0) {
  const base = D(price); const entered = D(value);
  const amount = method === "PERCENTAGE" ? percent(base, entered) : method === "FIXED" ? entered : method === "PER_PERSON" ? entered.mul(D(travellers)) : D(0);
  if (amount.greaterThan(base)) throw new Error("Discount cannot exceed the selling price.");
  return { amount, priceAfterDiscount: base.minus(amount) };
}

export function calculateTax(amount: DecimalValue, method: PricingInput["taxMethod"] = "NONE", value: DecimalValue = 0) {
  return method === "PERCENTAGE" ? percent(amount, value) : method === "FIXED" ? D(value) : D(0);
}

export function validateMinimumMargin(actualMargin: DecimalValue, minimumMargin: DecimalValue, approvedOverride = false) {
  const allowed = D(actualMargin).greaterThanOrEqualTo(D(minimumMargin)) || approvedOverride;
  return { allowed, requiresApproval: !allowed, shortfall: Prisma.Decimal.max(D(minimumMargin).minus(D(actualMargin)), ZERO) };
}

export function calculateSellingPrice(input: PricingInput) {
  const internalCost = D(input.internalCost);
  const travellers = D(input.travellerCount);
  assertNonNegative("Internal cost", internalCost);
  assertNonNegative("Traveller count", travellers);
  const contingency = calculateContingency(internalCost, input.contingencyMethod, input.contingencyValue, travellers, input.tourDays);
  const costAfterContingency = internalCost.plus(contingency);
  let markup: Prisma.Decimal;

  switch (input.markupMethod) {
    case "PERCENTAGE": markup = applyPercentageMarkup(costAfterContingency, input.markupValue ?? 0); break;
    case "FIXED": markup = applyFixedMarkup(costAfterContingency, input.markupValue ?? 0); break;
    case "PER_PERSON": markup = applyPerPersonMarkup(input.markupValue ?? 0, travellers); break;
    case "CATEGORY": markup = applyCategoryMarkup(input.categoryCosts ?? []); break;
    case "TARGET_PRICE": markup = impliedMarkupForTargetPrice(costAfterContingency, input.markupValue ?? 0); break;
    case "TARGET_MARGIN": markup = sellingPriceForTargetMargin(costAfterContingency, input.markupValue ?? 0).minus(costAfterContingency); break;
  }

  const priceBeforeTax = costAfterContingency.plus(markup);
  const tax = calculateTax(priceBeforeTax, input.taxMethod, input.taxValue);
  const priceBeforeDiscount = priceBeforeTax.plus(tax);
  const discount = applyDiscount(priceBeforeDiscount, input.discountMethod, input.discountValue, travellers);
  const finalSellingPrice = discount.priceAfterDiscount;
  const profitBeforeDiscount = priceBeforeDiscount.minus(costAfterContingency);
  const estimatedProfit = calculateProfit(finalSellingPrice, costAfterContingency);
  const marginBeforeDiscount = calculateProfitMargin(profitBeforeDiscount, priceBeforeDiscount);
  const estimatedMargin = calculateProfitMargin(estimatedProfit, finalSellingPrice);
  const markupPercentage = calculateMarkupPercentage(markup, costAfterContingency);
  const pricePerTraveller = travellers.isPositive() ? finalSellingPrice.div(travellers) : ZERO;
  const marginValidation = validateMinimumMargin(estimatedMargin, input.minimumMargin ?? 0);

  return { internalCost, contingency, costAfterContingency, markup, markupPercentage, priceBeforeTax, tax, priceBeforeDiscount, discount: discount.amount, finalSellingPrice, profitBeforeDiscount, estimatedProfit, marginBeforeDiscount, estimatedMargin, pricePerTraveller, marginValidation };
}

export function calculateActualProfitability(input: { estimatedCost: DecimalValue; actualCost: DecimalValue; quotedRevenue: DecimalValue; actualRevenue: DecimalValue; refunds?: DecimalValue; additionalRevenue?: DecimalValue }) {
  const actualRevenue = D(input.actualRevenue).plus(D(input.additionalRevenue ?? 0)).minus(D(input.refunds ?? 0));
  const estimatedProfit = D(input.quotedRevenue).minus(D(input.estimatedCost));
  const actualProfit = actualRevenue.minus(D(input.actualCost));
  return {
    estimatedCost: D(input.estimatedCost), actualCost: D(input.actualCost), costVariance: D(input.actualCost).minus(D(input.estimatedCost)),
    quotedRevenue: D(input.quotedRevenue), actualRevenue, estimatedProfit, actualProfit,
    estimatedMargin: calculateProfitMargin(estimatedProfit, input.quotedRevenue), actualMargin: calculateProfitMargin(actualProfit, actualRevenue),
  };
}

export function serializePricing(result: ReturnType<typeof calculateSellingPrice>) {
  const serialize = (value: unknown): unknown => {
    if (value instanceof Prisma.Decimal) return value.toFixed(4);
    if (Array.isArray(value)) return value.map(serialize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, serialize(nested)]),
      );
    }
    return value;
  };

  return serialize(result) as Record<string, unknown>;
}
