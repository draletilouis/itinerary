export type DashboardCurrencyTotal = {
  currencyCode: string;
  amount: string;
};

export function dashboardCurrencyTotals(
  values: DashboardCurrencyTotal[],
): DashboardCurrencyTotal[] {
  return values.length ? values : [{ currencyCode: "USD", amount: "0" }];
}
