import { describe, expect, it } from "vitest";
import { reconcilePackage, summarizePackageCosts } from "./reconciliation";

const cost = { category: "Activities", description: "Boat cruise", basis: "PER_PERSON" as const, unitCost: "30000", quantity: "1", days: "1", nights: "1", rooms: "1", vehicles: "1", eligibleTravellers: "5", taxPercentage: "0", commissionPercentage: "0", originalCurrencyCode: "UGX", classification: "INCLUDED" as const, inclusionText: "Boat cruise", dayNumber: 2 };

describe("package reconciliation", () => {
  it("matches costed itinerary services and totals variants", () => {
    const days = [{ dayNumber: 2, title: "River", meals: [], items: [{ type: "ACTIVITY" as const, title: "Boat cruise to the falls" }] }];
    expect(reconcilePackage(days, [cost])).toEqual([]);
    expect(summarizePackageCosts([cost])).toEqual([{ currencyCode: "UGX", included: 150000, optional: 0, withOptions: 150000 }]);
  });
  it("flags uncosted itinerary items", () => {
    const days = [{ dayNumber: 1, title: "Arrival", meals: [], items: [{ type: "ACTIVITY" as const, title: "Top of Falls" }] }];
    expect(reconcilePackage(days, [])).toHaveLength(1);
  });
});
