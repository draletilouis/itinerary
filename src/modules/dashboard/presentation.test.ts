import { describe, expect, it } from "vitest";
import { dashboardCurrencyTotals } from "./presentation";

describe("dashboard currency totals", () => {
  it("preserves USD as USD", () => {
    expect(dashboardCurrencyTotals([{ currencyCode: "USD", amount: "1250" }])).toEqual([
      { currencyCode: "USD", amount: "1250" },
    ]);
  });

  it("keeps mixed currencies as separate totals", () => {
    expect(dashboardCurrencyTotals([
      { currencyCode: "UGX", amount: "500000" },
      { currencyCode: "USD", amount: "250" },
    ])).toHaveLength(2);
  });

  it("uses a USD zero state when there is no financial activity", () => {
    expect(dashboardCurrencyTotals([])).toEqual([{ currencyCode: "USD", amount: "0" }]);
  });
});
