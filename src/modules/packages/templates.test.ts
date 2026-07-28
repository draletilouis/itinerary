import { describe, expect, it } from "vitest";
import { packageCosts, packageDays } from "./templates";

describe("standard package templates", () => {
  it("parses reusable itinerary days and items", () => {
    const days = packageDays([
      {
        dayNumber: 1,
        title: "Arrival in Entebbe",
        meals: ["Dinner"],
        items: [
          {
            type: "TRANSPORT",
            title: "Airport transfer",
          },
        ],
      },
    ]);

    expect(days[0]).toMatchObject({
      dayNumber: 1,
      title: "Arrival in Entebbe",
      meals: ["Dinner"],
    });
    expect(days[0].items[0].type).toBe("TRANSPORT");
  });

  it("parses reusable standard cost assumptions", () => {
    const costs = packageCosts([
      {
        category: "Guide",
        description: "Professional guide fee",
        basis: "STANDARD",
        unitCost: "150",
        quantity: "1",
        days: "3",
        nights: "0",
        rooms: "0",
        vehicles: "0",
        eligibleTravellers: "0",
        taxPercentage: "0",
        commissionPercentage: "0",
        originalCurrencyCode: "USD",
      },
    ]);

    expect(costs[0]).toMatchObject({
      category: "Guide",
      days: "3",
      originalCurrencyCode: "USD",
    });
  });

  it("rejects malformed package days", () => {
    expect(() =>
      packageDays([
        {
          dayNumber: 0,
          title: "A",
          meals: [],
          items: [],
        },
      ]),
    ).toThrow();
  });
});
