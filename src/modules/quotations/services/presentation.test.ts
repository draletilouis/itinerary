import { describe, expect, it } from "vitest";
import {
  allocateQuotationAmount,
  buildItineraryQuotationLines,
  buildTravellerPricing,
  getTravellerPricingRows,
} from "./presentation";

describe("quotation presentation", () => {
  it("allocates the exact selling total across costed itinerary items", () => {
    const lines = buildItineraryQuotationLines({
      total: "1695",
      fallbackTitle: "Tour package",
      items: [
        { id: "a", dayNumber: 1, sortOrder: 1, type: "ACTIVITY", title: "Gorilla trekking", linkedCost: "240" },
        { id: "b", dayNumber: 1, sortOrder: 2, type: "NOTE", title: "Welcome briefing", linkedCost: "0" },
        { id: "c", dayNumber: 2, sortOrder: 1, type: "ACCOMMODATION", title: "Forest lodge", linkedCost: "85" },
      ],
    });

    expect(lines.map((line) => line.total.toFixed(2))).toEqual(["1251.69", "0.00", "443.31"]);
    expect(lines.reduce((sum, line) => sum.plus(line.total), lines[0].total.mul(0)).toFixed(2)).toBe("1695.00");
    expect(lines[1].details).toBe("Day 1 · Note");
  });

  it("keeps narrative items included and adds a package line when no costs are linked", () => {
    const lines = buildItineraryQuotationLines({
      total: "100",
      fallbackTitle: "Three-day tour",
      items: [{ id: "a", dayNumber: 1, sortOrder: 1, type: "NOTE", title: "Arrival", linkedCost: 0 }],
    });
    expect(lines.map((line) => line.total.toFixed(2))).toEqual(["0.00", "100.00"]);
    expect(lines[1].description).toBe("Three-day tour");
  });

  it("places rounding residue on the final allocated item", () => {
    expect(allocateQuotationAmount("100", [1, 1, 1]).map((amount) => amount.toFixed(2))).toEqual([
      "33.33",
      "33.33",
      "33.34",
    ]);
  });

  it("creates an exact automatic per-traveller breakdown", () => {
    const pricing = buildTravellerPricing({ total: "100", adults: 2, children: 1 });
    const rows = getTravellerPricingRows({
      total: "100",
      adults: 2,
      children: 1,
      adultUnitPrice: pricing.adultUnitPrice,
      childUnitPrice: pricing.childUnitPrice,
      adjustment: pricing.adjustment,
    });
    expect(pricing.adjustment.toFixed(2)).toBe("0.01");
    expect(rows.map((row) => row.total.toFixed(2))).toEqual(["66.66", "33.34"]);
  });

  it("derives traveller rows for quotation versions created before presentation fields existed", () => {
    const rows = getTravellerPricingRows({
      total: "100",
      adults: 3,
      children: 0,
      adultUnitPrice: null,
      childUnitPrice: null,
      adjustment: 0,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].total.toFixed(2)).toBe("100.00");
  });

  it("rejects custom traveller rates that do not reconcile", () => {
    expect(() =>
      buildTravellerPricing({ total: "100", adults: 2, children: 1, adultUnitPrice: "40", childUnitPrice: "10" }),
    ).toThrow("must add up");
  });
});