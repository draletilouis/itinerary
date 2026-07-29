import { describe, expect, it } from "vitest";
import { basisFromRateUnit, isRateEffective } from "./itinerary-cost-import";

describe("itinerary cost import helpers", () => {
  it("maps supplier rate units to costing bases", () => {
    expect(basisFromRateUnit("per room per night")).toBe("ACCOMMODATION");
    expect(basisFromRateUnit("per person")).toBe("PER_PERSON");
    expect(basisFromRateUnit("per vehicle per day")).toBe("VEHICLE");
    expect(basisFromRateUnit("per guide per day")).toBe("STANDARD");
  });

  it("accepts rates inside inclusive validity dates", () => {
    const rate = {
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      endDate: new Date("2026-07-31T00:00:00.000Z"),
    };
    expect(isRateEffective(rate, new Date("2026-07-01T00:00:00.000Z"))).toBe(true);
    expect(isRateEffective(rate, new Date("2026-07-31T00:00:00.000Z"))).toBe(true);
    expect(isRateEffective(rate, new Date("2026-08-01T00:00:00.000Z"))).toBe(false);
  });

  it("accepts an open-ended rate after its start date", () => {
    expect(
      isRateEffective(
        { startDate: new Date("2026-01-01T00:00:00.000Z"), endDate: null },
        new Date("2027-01-01T00:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
