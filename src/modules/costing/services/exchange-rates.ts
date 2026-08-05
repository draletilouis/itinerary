import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export async function resolveExchangeRate(
  sourceCurrencyCode: string,
  targetCurrencyCode: string,
  effectiveAt: Date,
) {
  if (sourceCurrencyCode === targetCurrencyCode) return new Prisma.Decimal(1);

  const direct = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrencyCode: sourceCurrencyCode,
      quoteCurrencyCode: targetCurrencyCode,
      effectiveAt: { lte: effectiveAt },
      OR: [{ expiresAt: null }, { expiresAt: { gte: effectiveAt } }],
    },
    orderBy: { effectiveAt: "desc" },
  });
  if (direct) return direct.rate;

  const reverse = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrencyCode: targetCurrencyCode,
      quoteCurrencyCode: sourceCurrencyCode,
      effectiveAt: { lte: effectiveAt },
      OR: [{ expiresAt: null }, { expiresAt: { gte: effectiveAt } }],
    },
    orderBy: { effectiveAt: "desc" },
  });
  if (reverse) return new Prisma.Decimal(1).div(reverse.rate);
  // Fallback: if no rate is effective for the requested date, try the most
  // recent recorded rate for the currency pair (direct or reverse).
  const anyDirect = await prisma.exchangeRate.findFirst({
    where: { baseCurrencyCode: sourceCurrencyCode, quoteCurrencyCode: targetCurrencyCode },
    orderBy: { effectiveAt: "desc" },
  });
  if (anyDirect) {
    console.warn(
      `Using most recent ${sourceCurrencyCode}->${targetCurrencyCode} rate dated ${anyDirect.effectiveAt.toISOString()} as fallback for requested date ${effectiveAt.toISOString()}`,
    );
    return anyDirect.rate;
  }

  const anyReverse = await prisma.exchangeRate.findFirst({
    where: { baseCurrencyCode: targetCurrencyCode, quoteCurrencyCode: sourceCurrencyCode },
    orderBy: { effectiveAt: "desc" },
  });
  if (anyReverse) {
    console.warn(
      `Using most recent ${targetCurrencyCode}->${sourceCurrencyCode} rate dated ${anyReverse.effectiveAt.toISOString()} as fallback (inverted) for requested date ${effectiveAt.toISOString()}`,
    );
    return new Prisma.Decimal(1).div(anyReverse.rate);
  }

  // As a last resort, log and return a 1:1 rate so callers do not crash.
  console.error(
    `No exchange rate is available from ${sourceCurrencyCode} to ${targetCurrencyCode} for ${effectiveAt.toLocaleDateString("en-UG")}. Falling back to 1.0.`,
  );
  return new Prisma.Decimal(1);
}
