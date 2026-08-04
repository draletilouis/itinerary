import { describe, expect, it } from "vitest";
import { quotationNeedsZeroMarginOverride, validateZeroMarginOverride } from "./margin-guard";

describe("zero-margin quotation guard", () => {
  it("blocks prices at cost without a meaningful reason", () => {
    expect(quotationNeedsZeroMarginOverride({ internalCost: 5600000, sellingPrice: 5600000, estimatedMargin: 0 })).toBe(true);
    expect(() => validateZeroMarginOverride({ internalCost: 5600000, sellingPrice: 5600000, estimatedMargin: 0 }, "")).toThrow(/no profit/i);
  });
  it("allows a recorded business reason", () => {
    expect(() => validateZeroMarginOverride({ internalCost: 5600000, sellingPrice: 5600000, estimatedMargin: 0 }, "Approved promotional family rate")).not.toThrow();
  });
});
