import { describe, expect, it } from "vitest";
import { calculateQuotationRevision } from "./totals";

describe("quotation revision totals", () => {
  it("calculates total, profit, and margin without changing the cost snapshot", () => {
    const result = calculateQuotationRevision({
      subtotal: "10000",
      tax: "1800",
      discount: "800",
      internalCost: "8000",
    });
    expect(result.total.toString()).toBe("11000");
    expect(result.estimatedProfit.toString()).toBe("3000");
    expect(result.estimatedMargin.toFixed(4)).toBe("27.2727");
    expect(result.internalCost.toString()).toBe("8000");
  });

  it("rejects a discount above the quotation amount", () => {
    expect(() =>
      calculateQuotationRevision({
        subtotal: "1000",
        tax: "0",
        discount: "1200",
        internalCost: "500",
      }),
    ).toThrow("Discount cannot exceed");
  });
});
