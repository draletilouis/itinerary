"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";
import { convertFinancialAmount } from "../services/calculations";

const money = z.string().regex(/^\d+(\.\d{1,4})?$/, "Enter a valid amount.");
const rate = z.string().regex(/^\d+(\.\d{1,10})?$/, "Enter a valid exchange rate.");
const optional = z.string().trim().optional().default("");

function parseDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Select a valid ${label}.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Select a valid ${label}.`);
  }
  return parsed;
}

export async function createSupplierBillAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      supplierId: z.string().uuid(),
      tourId: optional,
      supplierRef: optional,
      currencyCode: z.string().length(3),
      issueDate: z.string().min(1),
      dueDate: z.string().min(1),
      total: money,
      notes: optional,
    })
    .parse(Object.fromEntries(formData));
  const bill = await prisma.$transaction(async (tx) => {
    const total = new Prisma.Decimal(data.total);
    if (!total.isPositive()) throw new Error("Supplier bill total must be greater than zero.");
    const reference = await nextReference(tx, "supplier_bill", "BILL");
    const created = await tx.supplierBill.create({
      data: {
        reference,
        supplierId: data.supplierId,
        tourId: data.tourId || null,
        supplierRef: data.supplierRef || null,
        currencyCode: data.currencyCode.toUpperCase(),
        issueDate: parseDate(data.issueDate, "bill issue date"),
        dueDate: parseDate(data.dueDate, "bill due date"),
        total,
        balanceDue: total,
        notes: data.notes || null,
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "supplier-bill.recorded",
      entityType: "SupplierBill",
      entityId: created.id,
      next: {
        reference,
        supplierId: created.supplierId,
        total: total.toString(),
        currencyCode: created.currencyCode,
      },
    });
    return created;
  });
  revalidatePath("/finance");
  if (bill.tourId) revalidatePath(`/tours/${bill.tourId}`);
}

export async function recordSupplierPaymentAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      billId: z.string().uuid(),
      paymentDate: z.string().min(1),
      paymentCurrencyCode: z.string().length(3),
      originalAmount: money,
      exchangeRate: rate,
      exchangeRateDate: z.string().min(1),
      method: z.string().trim().min(2),
      externalReference: optional,
      notes: optional,
    })
    .parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const bill = await tx.supplierBill.findUniqueOrThrow({ where: { id: data.billId } });
    if (["PAID", "CANCELLED"].includes(bill.status)) {
      throw new Error("This supplier bill cannot receive another payment.");
    }
    const originalAmount = new Prisma.Decimal(data.originalAmount);
    const exchangeRate = new Prisma.Decimal(data.exchangeRate);
    const converted = convertFinancialAmount(originalAmount, exchangeRate);
    if (converted.greaterThan(bill.balanceDue)) {
      throw new Error("Supplier payment cannot exceed the bill balance.");
    }
    const reference = await nextReference(tx, "supplier_payment", "SPAY");
    const payment = await tx.supplierPayment.create({
      data: {
        reference,
        supplierId: bill.supplierId,
        billId: bill.id,
        paymentDate: parseDate(data.paymentDate, "supplier payment date"),
        paymentCurrencyCode: data.paymentCurrencyCode.toUpperCase(),
        originalAmount,
        billCurrencyCode: bill.currencyCode,
        exchangeRate,
        exchangeRateDate: parseDate(data.exchangeRateDate, "exchange-rate date"),
        billCurrencyAmount: converted,
        method: data.method,
        externalReference: data.externalReference || null,
        notes: data.notes || null,
        createdById: actor.id,
      },
    });
    const amountPaid = bill.amountPaid.plus(converted);
    const balanceDue = bill.total.minus(amountPaid);
    await tx.supplierBill.update({
      where: { id: bill.id },
      data: {
        amountPaid,
        balanceDue,
        status: balanceDue.isZero() ? "PAID" : "PARTIALLY_PAID",
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "supplier-payment.recorded",
      entityType: "SupplierPayment",
      entityId: payment.id,
      next: {
        reference,
        billId: bill.id,
        originalAmount: originalAmount.toString(),
        exchangeRate: exchangeRate.toString(),
        billCurrencyAmount: converted.toString(),
      },
    });
  });
  revalidatePath("/finance");
}

export async function recordTourExpenseAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      tourId: z.string().uuid(),
      supplierId: optional,
      supplierBillId: optional,
      category: z.string().trim().min(2),
      description: z.string().trim().min(2),
      expenseDate: z.string().min(1),
      originalCurrencyCode: z.string().length(3),
      originalAmount: money,
      exchangeRate: rate,
      exchangeRateDate: z.string().min(1),
      receiptReference: optional,
      notes: optional,
    })
    .parse(Object.fromEntries(formData));
  const expense = await prisma.$transaction(async (tx) => {
    const tour = await tx.tour.findUniqueOrThrow({ where: { id: data.tourId } });
    const originalAmount = new Prisma.Decimal(data.originalAmount);
    const exchangeRate = new Prisma.Decimal(data.exchangeRate);
    const converted = convertFinancialAmount(originalAmount, exchangeRate);
    if (data.supplierBillId) {
      const bill = await tx.supplierBill.findUniqueOrThrow({
        where: { id: data.supplierBillId },
      });
      if (bill.tourId && bill.tourId !== tour.id) {
        throw new Error("Supplier bill belongs to another tour.");
      }
      if (data.supplierId && data.supplierId !== bill.supplierId) {
        throw new Error("Supplier and supplier bill do not match.");
      }
    }
    const reference = await nextReference(tx, "expense", "EXP");
    const created = await tx.tourExpense.create({
      data: {
        reference,
        tourId: tour.id,
        supplierId: data.supplierId || null,
        supplierBillId: data.supplierBillId || null,
        category: data.category,
        description: data.description,
        expenseDate: parseDate(data.expenseDate, "expense date"),
        originalCurrencyCode: data.originalCurrencyCode.toUpperCase(),
        originalAmount,
        costingCurrencyCode: tour.costingCurrencyCode,
        exchangeRate,
        exchangeRateDate: parseDate(data.exchangeRateDate, "exchange-rate date"),
        convertedAmount: converted,
        receiptReference: data.receiptReference || null,
        notes: data.notes || null,
        createdById: actor.id,
      },
    });
    const actualCost = tour.actualCost.plus(converted);
    const actualProfit = tour.actualRevenue.minus(actualCost);
    const actualMargin = tour.actualRevenue.isZero()
      ? new Prisma.Decimal(0)
      : actualProfit.div(tour.actualRevenue).mul(100);
    await tx.tour.update({
      where: { id: tour.id },
      data: { actualCost, actualProfit, actualMargin },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-expense.recorded",
      entityType: "TourExpense",
      entityId: created.id,
      next: {
        reference,
        originalAmount: originalAmount.toString(),
        originalCurrencyCode: created.originalCurrencyCode,
        exchangeRate: exchangeRate.toString(),
        convertedAmount: converted.toString(),
        costingCurrencyCode: tour.costingCurrencyCode,
      },
    });
    return created;
  });
  revalidatePath(`/tours/${expense.tourId}`);
  revalidatePath("/finance");
}

export async function reverseTourExpenseAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      expenseId: z.string().uuid(),
      reason: z.string().trim().min(3),
    })
    .parse(Object.fromEntries(formData));
  const expense = await prisma.$transaction(async (tx) => {
    const current = await tx.tourExpense.findUniqueOrThrow({
      where: { id: data.expenseId },
      include: { tour: true },
    });
    if (current.status === "REVERSED") throw new Error("Expense is already reversed.");
    const actualCost = Prisma.Decimal.max(
      current.tour.actualCost.minus(current.convertedAmount),
      new Prisma.Decimal(0),
    );
    const actualProfit = current.tour.actualRevenue.minus(actualCost);
    const actualMargin = current.tour.actualRevenue.isZero()
      ? new Prisma.Decimal(0)
      : actualProfit.div(current.tour.actualRevenue).mul(100);
    await tx.tourExpense.update({
      where: { id: current.id },
      data: {
        status: "REVERSED",
        reversedAt: new Date(),
        reversalReason: data.reason,
      },
    });
    await tx.tour.update({
      where: { id: current.tourId },
      data: { actualCost, actualProfit, actualMargin },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-expense.reversed",
      entityType: "TourExpense",
      entityId: current.id,
      previous: { status: current.status },
      next: { status: "REVERSED", reason: data.reason },
    });
    return current;
  });
  revalidatePath(`/tours/${expense.tourId}`);
  revalidatePath("/finance");
}
