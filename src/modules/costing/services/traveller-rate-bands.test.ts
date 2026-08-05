import { describe, expect, it } from "vitest";
import { calculateRateBandTotals, validateTravellerMix } from "./traveller-rate-bands";

const mix = {
  ugandanAdults: 2, ugandanChildren: 1,
  eastAfricanAdults: 1, eastAfricanChildren: 0,
  nonEastAfricanAdults: 2, nonEastAfricanChildren: 1,
};

describe("traveller rate bands", () => {
  it("prices a mixed group using the matching category and age rates", () => {
    const totals = calculateRateBandTotals([
      { pricingCategory: "UGANDAN", ageBand: "ADULT", unitCost: "20000", currencyCode: "UGX" },
      { pricingCategory: "UGANDAN", ageBand: "CHILD", unitCost: "10000", currencyCode: "UGX" },
      { pricingCategory: "EAST_AFRICAN", ageBand: "ADULT", unitCost: "30000", currencyCode: "UGX" },
      { pricingCategory: "NON_EAST_AFRICAN", ageBand: "ADULT", unitCost: "40", currencyCode: "USD" },
      { pricingCategory: "NON_EAST_AFRICAN", ageBand: "CHILD", unitCost: "20", currencyCode: "USD" },
    ], mix);
    expect(totals.map((entry) => [entry.pricingCategory, entry.ageBand, entry.travellerCount, entry.subtotal.toString()])).toEqual([
      ["UGANDAN", "ADULT", 2, "40000"],
      ["UGANDAN", "CHILD", 1, "10000"],
      ["EAST_AFRICAN", "ADULT", 1, "30000"],
      ["NON_EAST_AFRICAN", "ADULT", 2, "80"],
      ["NON_EAST_AFRICAN", "CHILD", 1, "20"],
    ]);
  });

  it("rejects pricing when a populated traveller category has no matching rate", () => {
    expect(() => calculateRateBandTotals([{ pricingCategory: "UGANDAN", ageBand: "ADULT", unitCost: "20000", currencyCode: "UGX" }], mix)).toThrow("rate is required");
  });

  it("rejects a category mix that does not reconcile with tour totals", () => {
    expect(() => validateTravellerMix(mix, 4, 2)).toThrow("adult counts");
    expect(validateTravellerMix(mix, 5, 2)).toEqual(mix);
  });
});
