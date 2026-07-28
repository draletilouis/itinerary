import { Prisma } from "@prisma/client";

type DecimalValue = Prisma.Decimal.Value;

export function convertFinancialAmount(
  originalAmount: DecimalValue,
  exchangeRate: DecimalValue,
) {
  const amount = new Prisma.Decimal(originalAmount);
  const rate = new Prisma.Decimal(exchangeRate);
  if (!amount.isPositive()) throw new Error("Amount must be greater than zero.");
  if (!rate.isPositive()) throw new Error("Exchange rate must be greater than zero.");
  return amount.mul(rate);
}

export function calculateFinancialBalance(
  total: DecimalValue,
  paid: DecimalValue,
  refunded: DecimalValue = 0,
) {
  const enteredTotal = new Prisma.Decimal(total);
  const enteredPaid = new Prisma.Decimal(paid);
  const enteredRefunded = new Prisma.Decimal(refunded);
  if (enteredTotal.isNegative() || enteredPaid.isNegative() || enteredRefunded.isNegative()) {
    throw new Error("Financial totals cannot be negative.");
  }
  if (enteredRefunded.greaterThan(enteredPaid)) {
    throw new Error("Refunds cannot exceed recorded payments.");
  }
  const netPaid = enteredPaid.minus(enteredRefunded);
  if (netPaid.greaterThan(enteredTotal)) {
    throw new Error("Net payments cannot exceed the financial total.");
  }
  return {
    netPaid,
    balanceDue: enteredTotal.minus(netPaid),
  };
}

export function invoiceStatusForBalance(
  total: DecimalValue,
  netPaid: DecimalValue,
): "ISSUED" | "PARTIALLY_PAID" | "PAID" {
  const invoiceTotal = new Prisma.Decimal(total);
  const paid = new Prisma.Decimal(netPaid);
  if (paid.isZero()) return "ISSUED";
  if (paid.greaterThanOrEqualTo(invoiceTotal)) return "PAID";
  return "PARTIALLY_PAID";
}

export function bookingPaymentState(
  total: DecimalValue,
  netPaid: DecimalValue,
): {
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  bookingStatus: "AWAITING_DEPOSIT" | "PARTIALLY_PAID" | "FULLY_PAID";
} {
  const enteredTotal = new Prisma.Decimal(total);
  const enteredPaid = new Prisma.Decimal(netPaid);
  if (enteredPaid.isZero()) {
    return { paymentStatus: "UNPAID", bookingStatus: "AWAITING_DEPOSIT" };
  }
  if (enteredPaid.greaterThanOrEqualTo(enteredTotal)) {
    return { paymentStatus: "PAID", bookingStatus: "FULLY_PAID" };
  }
  return { paymentStatus: "PARTIALLY_PAID", bookingStatus: "PARTIALLY_PAID" };
}
