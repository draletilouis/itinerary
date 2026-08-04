import { describe, expect, it } from "vitest";
import { calculateCostItem } from "./pricing";

describe("package automation cost bases", () => {
  it("calculates person-night accommodation", () => {
    const result = calculateCostItem({ basis: "PER_PERSON_PER_NIGHT", category: "Accommodation", unitCost: 190500, eligibleTravellers: 5, nights: 4 });
    expect(result.originalTotal.toString()).toBe("3810000");
  });
  it("calculates person-day park fees", () => {
    const result = calculateCostItem({ basis: "PER_PERSON_PER_DAY", category: "Permits", unitCost: 25000, eligibleTravellers: 5, days: 4 });
    expect(result.originalTotal.toString()).toBe("500000");
  });
});
