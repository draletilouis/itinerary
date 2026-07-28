import type { QuotationStatus } from "@prisma/client";

const ALLOWED_TRANSITIONS: Partial<Record<QuotationStatus, QuotationStatus[]>> = {
  GENERATED: ["SENT", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"],
  SENT: ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"],
};

function utcDateValue(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function isQuotationExpired(validUntil: Date, now = new Date()) {
  return utcDateValue(now) > utcDateValue(validUntil);
}

export function parseFutureValidityDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Enter a valid quotation expiry date.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Enter a valid quotation expiry date.");
  }
  if (isQuotationExpired(parsed, now)) {
    throw new Error("Quotation expiry date cannot be in the past.");
  }
  return parsed;
}

export function assertQuotationTransition(
  current: QuotationStatus,
  next: QuotationStatus,
) {
  if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
    throw new Error(`Quotation cannot move from ${current} to ${next}.`);
  }
}
