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

  throw new Error(
    `No exchange rate is available from ${sourceCurrencyCode} to ${targetCurrencyCode} for ${effectiveAt.toLocaleDateString("en-UG")}.`,
  );
}
