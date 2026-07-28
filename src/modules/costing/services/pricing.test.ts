import { describe, expect, it } from "vitest";
import {
  applyCategoryMarkup,
  calculateActualProfitability,
  calculateCostItem,
  calculateSellingPrice,
  convertCurrency,
  sellingPriceForTargetMargin,
  serializePricing,
  validateMinimumMargin,
} from "./pricing";

describe("tour pricing", () => {
  it("distinguishes markup from margin", () => {
    const result = calculateSellingPrice({
      internalCost: "8000",
      travellerCount: "4",
      markupMethod: "PERCENTAGE",
      markupValue: "25",
    });

    expect(result.finalSellingPrice.toString()).toBe("10000");
    expect(result.estimatedProfit.toString()).toBe("2000");
    expect(result.markupPercentage.toString()).toBe("25");
    expect(result.estimatedMargin.toString()).toBe("20");
    expect(result.pricePerTraveller.toString()).toBe("2500");
  });

  it("converts supplier costs with decimal-safe arithmetic", () => {
    expect(convertCurrency("500", "3850").toString()).toBe("1925000");
  });

  it("calculates accommodation by rooms and nights", () => {
    const result = calculateCostItem({
      category: "Accommodation",
      basis: "ACCOMMODATION",
      unitCost: "180",
      rooms: "3",
      nights: "4",
      exchangeRate: "1",
    });

    expect(result.originalSubtotal.toString()).toBe("2160");
  });

  it("requires a reason for a manual cost override", () => {
    expect(() =>
      calculateCostItem({
        category: "Other",
        basis: "OVERRIDE",
        unitCost: "0",
        overrideTotal: "250",
      }),
    ).toThrow("override reason");
  });

  it("calculates a target margin from cost", () => {
    expect(sellingPriceForTargetMargin("8000", "20").toString()).toBe("10000");
  });

  it("applies category-level markup", () => {
    expect(
      applyCategoryMarkup([
        { category: "Accommodation", amount: "2000", markupPercentage: "15" },
        { category: "Activities", amount: "1000", markupPercentage: "25" },
      ]).toString(),
    ).toBe("550");
  });

  it("supports a tour with no minimum margin", () => {
    expect(validateMinimumMargin("4", "0")).toMatchObject({
      allowed: true,
      requiresApproval: false,
    });
  });

  it("blocks a below-minimum price until an override is authorised", () => {
    const blocked = validateMinimumMargin("12", "18");
    const authorised = validateMinimumMargin("12", "18", true);

    expect(blocked.allowed).toBe(false);
    expect(blocked.shortfall.toString()).toBe("6");
    expect(authorised.allowed).toBe(true);
  });

  it("recalculates profit and margin after discount", () => {
    const result = calculateSellingPrice({
      internalCost: "1000",
      travellerCount: "2",
      markupMethod: "PERCENTAGE",
      markupValue: "25",
      discountMethod: "FIXED",
      discountValue: "100",
    });

    expect(result.finalSellingPrice.toString()).toBe("1150");
    expect(result.estimatedProfit.toString()).toBe("150");
    expect(result.estimatedMargin.toFixed(4)).toBe("13.0435");
  });

  it("compares estimated and actual profitability", () => {
    const result = calculateActualProfitability({
      estimatedCost: "8000",
      actualCost: "8500",
      quotedRevenue: "10000",
      actualRevenue: "10000",
      refunds: "250",
      additionalRevenue: "500",
    });

    expect(result.actualRevenue.toString()).toBe("10250");
    expect(result.actualProfit.toString()).toBe("1750");
    expect(result.costVariance.toString()).toBe("500");
  });

  it("serializes nested Decimal values for server actions", () => {
    const serialized = serializePricing(
      calculateSellingPrice({
        internalCost: "8000",
        travellerCount: "4",
        markupMethod: "PERCENTAGE",
        markupValue: "25",
        minimumMargin: "21",
      }),
    );

    expect(serialized.finalSellingPrice).toBe("10000.0000");
    expect(serialized.marginValidation).toMatchObject({
      allowed: false,
      shortfall: "1.0000",
    });
  });
});
