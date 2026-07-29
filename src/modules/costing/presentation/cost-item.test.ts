import { describe, expect, it } from "vitest";
import { costItemDisplay } from "./cost-item";

const value = (input: string) => ({ toString: () => input });

describe("cost item presentation", () => {
  it("explains a per-person calculation and same-currency conversion", () => {
    const display = costItemDisplay({
      basis: "PER_PERSON",
      unitCost: value("120"),
      quantity: value("1"),
      days: value("1"),
      nights: value("0"),
      rooms: value("0"),
      vehicles: value("0"),
      eligibleTravellers: value("4"),
      overrideTotal: null,
      originalCurrencyCode: "USD",
      convertedCurrencyCode: "USD",
      exchangeRate: value("1"),
    });

    expect(display.basisLabel).toBe("Per traveller");
    expect(display.formula).toContain("4 traveller(s)");
    expect(display.conversionLabel).toBe("No conversion");
  });

  it("labels an actual currency conversion explicitly", () => {
    const display = costItemDisplay({
      basis: "VEHICLE",
      unitCost: value("220"),
      quantity: value("1"),
      days: value("3"),
      nights: value("0"),
      rooms: value("0"),
      vehicles: value("1"),
      eligibleTravellers: value("0"),
      overrideTotal: null,
      originalCurrencyCode: "USD",
      convertedCurrencyCode: "UGX",
      exchangeRate: value("3700"),
    });

    expect(display.formula).toContain("1 vehicle(s) × 3 day(s)");
    expect(display.conversionLabel).toBe("1 USD = 3,700 UGX");
  });
});
