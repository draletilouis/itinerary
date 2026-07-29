import { describe, expect, it } from "vitest";
import {
  estimatePackageCost,
  packageNights,
  suggestedCostBasis,
  supplierRateBasis,
} from "./presentation";

describe("package presentation helpers", () => {
  it("derives nights from inclusive tour days", () => {
    expect(packageNights(3)).toBe(2);
    expect(packageNights(1)).toBe(0);
  });

  it("suggests a simple charging method from the category", () => {
    expect(suggestedCostBasis("Accommodation")).toBe("ACCOMMODATION");
    expect(suggestedCostBasis("Transport")).toBe("VEHICLE");
    expect(suggestedCostBasis("Guides")).toBe("STANDARD");
  });

  it("derives a costing basis from supplier rate units", () => {
    expect(supplierRateBasis("vehicle / day", "Transport")).toBe("VEHICLE");
    expect(supplierRateBasis("per person", "Activities")).toBe("PER_PERSON");
    expect(supplierRateBasis("room / night", "Accommodation")).toBe("ACCOMMODATION");
  });


  it("previews accommodation with tax and commission", () => {
    const result = estimatePackageCost({
      basis: "ACCOMMODATION",
      unitCost: "180",
      quantity: "1",
      days: "1",
      nights: "2",
      rooms: "2",
      vehicles: "0",
      eligibleTravellers: "0",
      taxPercentage: "10",
      commissionPercentage: "5",
    });

    expect(result.subtotal).toBe(720);
    expect(result.total).toBe(756);
  });
});
