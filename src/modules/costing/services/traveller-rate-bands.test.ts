import { describe, expect, it } from "vitest";
import { calculateRateBandTotals, validateTravellerMix } from "./traveller-rate-bands";

const mix = {
  ugandanAdults: 2, ugandanChildren: 1,
  foreignersAdults: 2, foreignersChildren: 1,
  residentForeignersAdults: 1, residentForeignersChildren: 0,
  eastAfricanAdults: 1, eastAfricanChildren: 0,
};

describe("traveller rate bands", () => {
  it("prices a mixed group using the matching category and age rates", () => {
    const totals = calculateRateBandTotals([
      { pricingCategory: "UGANDANS", ageBand: "ADULT", unitCost: "20000", currencyCode: "UGX" },
      { pricingCategory: "UGANDANS", ageBand: "CHILD", unitCost: "10000", currencyCode: "UGX" },
      { pricingCategory: "FOREIGNERS", ageBand: "ADULT", unitCost: "30000", currencyCode: "UGX" },
      { pricingCategory: "FOREIGNERS", ageBand: "CHILD", unitCost: "15000", currencyCode: "UGX" },
      { pricingCategory: "RESIDENT_FOREIGNERS", ageBand: "ADULT", unitCost: "25000", currencyCode: "UGX" },
      { pricingCategory: "EAST_AFRICANS", ageBand: "ADULT", unitCost: "40", currencyCode: "USD" },
    ], mix);
    expect(totals.map((entry) => [entry.pricingCategory, entry.ageBand, entry.travellerCount, entry.subtotal.toString()])).toEqual([
      ["UGANDANS", "ADULT", 2, "40000"],
      ["UGANDANS", "CHILD", 1, "10000"],
      ["FOREIGNERS", "ADULT", 2, "60000"],
      ["FOREIGNERS", "CHILD", 1, "15000"],
      ["RESIDENT_FOREIGNERS", "ADULT", 1, "25000"],
      ["EAST_AFRICANS", "ADULT", 1, "40"],
    ]);
  });

  it("rejects pricing when a populated traveller category has no matching rate", () => {
    expect(() => calculateRateBandTotals([{ pricingCategory: "UGANDANS", ageBand: "ADULT", unitCost: "20000", currencyCode: "UGX" }], mix)).toThrow("rate is required");
  });

  it("rejects a category mix that does not reconcile with tour totals", () => {
    expect(() => validateTravellerMix(mix, 4, 2)).toThrow("adult counts");
    expect(validateTravellerMix(mix, 6, 2)).toEqual(mix);
  });
});
