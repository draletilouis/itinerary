import { prisma } from "@/server/db/prisma";

const REPORTING_FALLBACK = "UGX";

function liveExchangeRateFilter(asOf: Date) {
  return {
    AND: [
      { effectiveAt: { lte: asOf } },
      { OR: [{ expiresAt: null }, { expiresAt: { gte: asOf } }] },
    ],
  };
}

export async function getPricingCurrencyCodes(asOf = new Date()) {
  const company = await prisma.companyProfile.findUnique({
    where: { singletonKey: "primary" },
    select: { reportingCurrencyCode: true },
  });
  const currencies = await prisma.currency.findMany({
    where: { active: true },
    select: { code: true },
    orderBy: { code: "asc" },
  });
  const activeCodes = currencies.map((entry) => entry.code);
  const rates = activeCodes.length
    ? await prisma.exchangeRate.findMany({
        where: {
          AND: [
            liveExchangeRateFilter(asOf),
            {
              OR: [
                { baseCurrencyCode: { in: activeCodes } },
                { quoteCurrencyCode: { in: activeCodes } },
              ],
            },
          ],
        },
        select: { baseCurrencyCode: true, quoteCurrencyCode: true },
      })
    : [];

  const supported = new Set<string>([company?.reportingCurrencyCode ?? REPORTING_FALLBACK]);
  for (const rate of rates) {
    supported.add(rate.baseCurrencyCode);
    supported.add(rate.quoteCurrencyCode);
  }
  return activeCodes.filter((code) => supported.has(code));
}

export async function assertPricingCurrencyAvailable(currencyCode: string, asOf = new Date()) {
  const normalized = currencyCode.trim().toUpperCase();
  if (!normalized) throw new Error('Select a currency with a fixed exchange rate first.');
  const supportedCodes = await getPricingCurrencyCodes(asOf);
  if (!supportedCodes.includes(normalized)) {
    throw new Error('Select a currency with a fixed exchange rate first.');
  }
  return normalized;
}
