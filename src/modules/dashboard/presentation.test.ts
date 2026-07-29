import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { convertDashboardTotals } from "./presentation";

describe("dashboard currency totals", () => {
  const asOf = new Date("2026-07-29T00:00:00.000Z");
  const usdToUgx = {
    baseCurrencyCode: "USD",
    quoteCurrencyCode: "UGX",
    rate: new Prisma.Decimal(3700),
    effectiveAt: new Date("2026-07-01T00:00:00.000Z"),
    expiresAt: null,
  };

  it("converts USD totals into UGX", () => {
    const result = convertDashboardTotals([{ currencyCode: "USD", amount: "100" }], [usdToUgx], "UGX", asOf);
    expect(result.total.toString()).toBe("370000");
    expect(result.unresolvedCurrencies).toEqual([]);
  });

  it("adds UGX and converted USD into one UGX total", () => {
    const result = convertDashboardTotals([
      { currencyCode: "UGX", amount: "500000" },
      { currencyCode: "USD", amount: "100" },
    ], [usdToUgx], "UGX", asOf);
    expect(result.total.toString()).toBe("870000");
  });

  it("reports currencies with no effective conversion rate", () => {
    const result = convertDashboardTotals([{ currencyCode: "EUR", amount: "100" }], [], "UGX", asOf);
    expect(result.total.toString()).toBe("0");
    expect(result.unresolvedCurrencies).toEqual(["EUR"]);
  });
});
