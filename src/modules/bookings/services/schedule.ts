import { Prisma } from "@prisma/client";

type DecimalValue = Prisma.Decimal.Value;

export type PaymentScheduleInput = {
  label: string;
  dueDate: Date;
  amount: DecimalValue;
};

export function buildPaymentSchedule(
  totalAmount: DecimalValue,
  entries: PaymentScheduleInput[],
) {
  const total = new Prisma.Decimal(totalAmount);
  if (!total.isPositive()) {
    throw new Error("Booking total must be greater than zero.");
  }
  if (!entries.length) {
    throw new Error("Add at least one payment milestone.");
  }

  let previousDate: number | null = null;
  const schedule = entries.map((entry, index) => {
    const amount = new Prisma.Decimal(entry.amount);
    if (!amount.isPositive()) {
      throw new Error("Payment milestone amounts must be greater than zero.");
    }
    if (!entry.label.trim()) {
      throw new Error("Every payment milestone needs a label.");
    }
    const dueDate = new Date(entry.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new Error("Every payment milestone needs a valid due date.");
    }
    const dateValue = Date.UTC(
      dueDate.getUTCFullYear(),
      dueDate.getUTCMonth(),
      dueDate.getUTCDate(),
    );
    if (previousDate !== null && dateValue < previousDate) {
      throw new Error("Payment milestone dates must be in chronological order.");
    }
    previousDate = dateValue;
    return {
      sequence: index + 1,
      label: entry.label.trim(),
      dueDate,
      amount,
    };
  });

  const scheduledTotal = schedule.reduce(
    (sum, entry) => sum.plus(entry.amount),
    new Prisma.Decimal(0),
  );
  if (!scheduledTotal.equals(total)) {
    throw new Error("Payment schedule must equal the accepted booking total.");
  }
  return schedule;
}

export function buildDepositSchedule(input: {
  totalAmount: DecimalValue;
  depositAmount: DecimalValue;
  depositDueDate?: Date | null;
  instalments?: Array<{
    label: string;
    amount: DecimalValue;
    dueDate: Date;
  }>;
  finalPaymentDate: Date;
}) {
  const total = new Prisma.Decimal(input.totalAmount);
  const deposit = new Prisma.Decimal(input.depositAmount);
  if (deposit.isNegative() || deposit.greaterThan(total)) {
    throw new Error("Deposit must be between zero and the booking total.");
  }
  const entries: PaymentScheduleInput[] = [];
  if (deposit.isPositive()) {
    if (!input.depositDueDate) {
      throw new Error("Select a deposit due date.");
    }
    entries.push({
      label: "Deposit",
      amount: deposit,
      dueDate: input.depositDueDate,
    });
  }
  for (const instalment of input.instalments ?? []) {
    entries.push(instalment);
  }
  const allocated = entries.reduce(
    (sum, entry) => sum.plus(entry.amount),
    new Prisma.Decimal(0),
  );
  const finalBalance = total.minus(allocated);
  if (finalBalance.isNegative()) {
    throw new Error("Deposit and instalments cannot exceed the booking total.");
  }
  if (finalBalance.isPositive()) {
    entries.push({
      label: "Final balance",
      amount: finalBalance,
      dueDate: input.finalPaymentDate,
    });
  }
  return buildPaymentSchedule(total, entries);
}
