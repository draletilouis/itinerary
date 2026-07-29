import { Prisma } from "@prisma/client";

export type DashboardCurrencyTotal = {
  currencyCode: string;
  amount: string;
};

type DashboardExchangeRate = {
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  rate: Prisma.Decimal;
  effectiveAt: Date;
  expiresAt: Date | null;
};

export function convertDashboardTotals(
  values: DashboardCurrencyTotal[],
  rates: DashboardExchangeRate[],
  targetCurrency: string,
  asOf: Date,
) {
  let total = new Prisma.Decimal(0);
  const unresolvedCurrencies: string[] = [];

  for (const value of values) {
    const amount = new Prisma.Decimal(value.amount);
    if (value.currencyCode === targetCurrency) {
      total = total.plus(amount);
      continue;
    }
    const direct = rates.find(
      (rate) =>
        rate.baseCurrencyCode === value.currencyCode &&
        rate.quoteCurrencyCode === targetCurrency &&
        rate.effectiveAt <= asOf &&
        (!rate.expiresAt || rate.expiresAt >= asOf),
    );
    const inverse = rates.find(
      (rate) =>
        rate.baseCurrencyCode === targetCurrency &&
        rate.quoteCurrencyCode === value.currencyCode &&
        rate.effectiveAt <= asOf &&
        (!rate.expiresAt || rate.expiresAt >= asOf),
    );
    if (direct) {
      total = total.plus(amount.mul(direct.rate));
    } else if (inverse) {
      total = total.plus(amount.div(inverse.rate));
    } else {
      unresolvedCurrencies.push(value.currencyCode);
    }
  }

  return { total, unresolvedCurrencies: [...new Set(unresolvedCurrencies)] };
}
