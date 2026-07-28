"use server";

import { Prisma } from "@prisma/client";
import type { InvoiceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";
import {
  bookingPaymentState,
  calculateFinancialBalance,
  convertFinancialAmount,
  invoiceStatusForBalance,
} from "../services/calculations";

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

async function refreshInvoice(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      allocations: { where: { reversedAt: null } },
      refunds: { where: { status: "RECORDED" } },
    },
  });
  const paid = invoice.allocations.reduce(
    (sum, entry) => sum.plus(entry.invoiceCurrencyAmount),
    new Prisma.Decimal(0),
  );
  const refunded = invoice.refunds.reduce(
    (sum, entry) => sum.plus(entry.bookingCurrencyAmount),
    new Prisma.Decimal(0),
  );
  const totals = calculateFinancialBalance(invoice.total, paid, refunded);
  const status = invoiceStatusForBalance(invoice.total, totals.netPaid);
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: totals.netPaid,
      balanceDue: totals.balanceDue,
      status,
    },
  });
  if (invoice.paymentScheduleId) {
    await tx.bookingPaymentSchedule.update({
      where: { id: invoice.paymentScheduleId },
      data: {
        amountPaid: totals.netPaid,
        status: totals.balanceDue.isZero()
          ? "PAID"
          : invoice.dueDate < new Date()
            ? "DUE"
            : "PENDING",
      },
    });
  }
}

async function refreshBooking(tx: Prisma.TransactionClient, bookingId: string) {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      acceptedQuotationVersion: { include: { pricing: true } },
      customerPayments: {
        where: { status: "RECORDED" },
        include: {
          allocations: { where: { reversedAt: null } },
          refunds: { where: { status: "RECORDED" } },
        },
      },
      tour: true,
    },
  });
  const allocated = booking.customerPayments.reduce(
    (sum, payment) =>
      sum.plus(
        payment.allocations.reduce(
          (nested, entry) => nested.plus(entry.invoiceCurrencyAmount),
          new Prisma.Decimal(0),
        ),
      ),
    new Prisma.Decimal(0),
  );
  const refunded = booking.customerPayments.reduce(
    (sum, payment) =>
      sum.plus(
        payment.refunds.reduce(
          (nested, entry) => nested.plus(entry.bookingCurrencyAmount),
          new Prisma.Decimal(0),
        ),
      ),
    new Prisma.Decimal(0),
  );
  const totals = calculateFinancialBalance(booking.totalAmount, allocated, refunded);
  const state = bookingPaymentState(booking.totalAmount, totals.netPaid);
  const closed = ["CANCELLED", "COMPLETED", "REFUNDED"].includes(booking.status);
  await tx.booking.update({
    where: { id: booking.id },
    data: {
      amountPaid: totals.netPaid,
      balanceDue: totals.balanceDue,
      status: closed ? booking.status : state.bookingStatus,
    },
  });

  const quotationRate = booking.acceptedQuotationVersion.pricing.costingToQuotationRate;
  if (!quotationRate.isPositive()) {
    throw new Error("Accepted quotation has an invalid costing exchange rate.");
  }
  const actualRevenue = totals.netPaid.div(quotationRate);
  const actualProfit = actualRevenue.minus(booking.tour.actualCost);
  const actualMargin = actualRevenue.isZero()
    ? new Prisma.Decimal(0)
    : actualProfit.div(actualRevenue).mul(100);
  await tx.tour.update({
    where: { id: booking.tourId },
    data: {
      actualRevenue,
      actualProfit,
      actualMargin,
      paymentStatus: state.paymentStatus,
      bookingStatus: closed ? booking.status : state.bookingStatus,
    },
  });
}

export async function issueScheduleInvoiceAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const scheduleId = z.string().uuid().parse(formData.get("scheduleId"));
  const invoice = await prisma.$transaction(async (tx) => {
    const schedule = await tx.bookingPaymentSchedule.findUniqueOrThrow({
      where: { id: scheduleId },
      include: { booking: true, invoice: true },
    });
    if (schedule.invoice) return schedule.invoice;
    if (schedule.booking.status === "CANCELLED") {
      throw new Error("Cancelled bookings cannot be invoiced.");
    }
    const reference = await nextReference(tx, "invoice", "INV");
    const type: InvoiceType =
      schedule.label === "Deposit"
        ? "DEPOSIT"
        : schedule.label === "Final balance"
          ? "FINAL_BALANCE"
          : "INSTALMENT";
    const created = await tx.invoice.create({
      data: {
        reference,
        bookingId: schedule.bookingId,
        customerId: schedule.booking.customerId,
        paymentScheduleId: schedule.id,
        type,
        currencyCode: schedule.booking.currencyCode,
        issueDate: new Date(),
        dueDate: schedule.dueDate,
        subtotal: schedule.amount,
        total: schedule.amount,
        balanceDue: schedule.amount,
        status: "ISSUED",
        issuedAt: new Date(),
        createdById: actor.id,
        lines: {
          create: {
            sortOrder: 1,
            description: `${schedule.label} — ${schedule.booking.reference}`,
            unitPrice: schedule.amount,
            total: schedule.amount,
          },
        },
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "invoice.issued",
      entityType: "Invoice",
      entityId: created.id,
      next: {
        reference,
        bookingId: schedule.bookingId,
        scheduleId: schedule.id,
        total: schedule.amount.toString(),
      },
    });
    return created;
  });
  revalidatePath(`/bookings/${invoice.bookingId}`);
  revalidatePath("/finance");
}

export async function createAdditionalInvoiceAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      bookingId: z.string().uuid(),
      description: z.string().trim().min(2),
      subtotal: money,
      tax: money,
      dueDate: z.string().min(1),
      notes: optional,
    })
    .parse(Object.fromEntries(formData));
  const invoice = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: data.bookingId } });
    if (booking.status === "CANCELLED") throw new Error("Cancelled bookings cannot be invoiced.");
    const subtotal = new Prisma.Decimal(data.subtotal);
    const tax = new Prisma.Decimal(data.tax);
    const total = subtotal.plus(tax);
    if (!total.isPositive()) throw new Error("Invoice total must be greater than zero.");
    const reference = await nextReference(tx, "invoice", "INV");
    const created = await tx.invoice.create({
      data: {
        reference,
        bookingId: booking.id,
        customerId: booking.customerId,
        type: "ADDITIONAL_SERVICE",
        currencyCode: booking.currencyCode,
        issueDate: new Date(),
        dueDate: parseDate(data.dueDate, "invoice due date"),
        subtotal,
        tax,
        total,
        balanceDue: total,
        status: "ISSUED",
        issuedAt: new Date(),
        notes: data.notes || null,
        createdById: actor.id,
        lines: {
          create: {
            sortOrder: 1,
            description: data.description,
            unitPrice: subtotal,
            total: subtotal,
          },
        },
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        totalAmount: { increment: total },
        balanceDue: { increment: total },
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "invoice.additional-service-issued",
      entityType: "Invoice",
      entityId: created.id,
      next: { bookingId: booking.id, total: total.toString() },
    });
    return created;
  });
  revalidatePath(`/bookings/${invoice.bookingId}`);
  revalidatePath("/finance");
}

export async function recordCustomerPaymentAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      bookingId: z.string().uuid(),
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
  const payment = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: data.bookingId } });
    if (booking.status === "CANCELLED") throw new Error("Cancelled bookings cannot receive payments.");
    const originalAmount = new Prisma.Decimal(data.originalAmount);
    const exchangeRate = new Prisma.Decimal(data.exchangeRate);
    const converted = convertFinancialAmount(originalAmount, exchangeRate);
    const receiptReference = await nextReference(tx, "receipt", "REC");
    const created = await tx.customerPayment.create({
      data: {
        receiptReference,
        customerId: booking.customerId,
        bookingId: booking.id,
        paymentDate: parseDate(data.paymentDate, "payment date"),
        paymentCurrencyCode: data.paymentCurrencyCode.toUpperCase(),
        originalAmount,
        bookingCurrencyCode: booking.currencyCode,
        exchangeRate,
        exchangeRateDate: parseDate(data.exchangeRateDate, "exchange-rate date"),
        bookingCurrencyAmount: converted,
        method: data.method,
        externalReference: data.externalReference || null,
        notes: data.notes || null,
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "customer-payment.recorded",
      entityType: "CustomerPayment",
      entityId: created.id,
      next: {
        receiptReference,
        originalAmount: originalAmount.toString(),
        paymentCurrencyCode: created.paymentCurrencyCode,
        exchangeRate: exchangeRate.toString(),
        bookingCurrencyAmount: converted.toString(),
      },
    });
    return created;
  });
  revalidatePath(`/bookings/${payment.bookingId}`);
  revalidatePath("/finance");
}

export async function allocateCustomerPaymentAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      paymentId: z.string().uuid(),
      invoiceId: z.string().uuid(),
      invoiceCurrencyAmount: money,
    })
    .parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.findUniqueOrThrow({
      where: { id: data.paymentId },
      include: { allocations: { where: { reversedAt: null } } },
    });
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: data.invoiceId } });
    if (payment.status !== "RECORDED") throw new Error("Reversed payments cannot be allocated.");
    if (payment.bookingId !== invoice.bookingId) {
      throw new Error("Payment and invoice must belong to the same booking.");
    }
    if (invoice.currencyCode !== payment.bookingCurrencyCode) {
      throw new Error("Invoice must use the booking currency.");
    }
    if (["CANCELLED", "REFUNDED"].includes(invoice.status)) {
      throw new Error("This invoice cannot receive allocations.");
    }
    const invoiceAmount = new Prisma.Decimal(data.invoiceCurrencyAmount);
    if (!invoiceAmount.isPositive() || invoiceAmount.greaterThan(invoice.balanceDue)) {
      throw new Error("Allocation cannot exceed the invoice balance.");
    }
    const alreadyAllocated = payment.allocations.reduce(
      (sum, entry) => sum.plus(entry.invoiceCurrencyAmount),
      new Prisma.Decimal(0),
    );
    if (alreadyAllocated.plus(invoiceAmount).greaterThan(payment.bookingCurrencyAmount)) {
      throw new Error("Allocation cannot exceed the unallocated payment balance.");
    }
    const paymentAmount = invoiceAmount.div(payment.exchangeRate);
    const allocation = await tx.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        invoiceId: invoice.id,
        paymentCurrencyAmount: paymentAmount,
        invoiceCurrencyAmount: invoiceAmount,
        exchangeRate: payment.exchangeRate,
        exchangeRateDate: payment.exchangeRateDate,
      },
    });
    await refreshInvoice(tx, invoice.id);
    await refreshBooking(tx, payment.bookingId);
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "customer-payment.allocated",
      entityType: "PaymentAllocation",
      entityId: allocation.id,
      next: {
        paymentId: payment.id,
        invoiceId: invoice.id,
        invoiceCurrencyAmount: invoiceAmount.toString(),
      },
    });
  });
  revalidatePath("/finance");
}

export async function recordRefundAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      allocationId: z.string().uuid(),
      refundDate: z.string().min(1),
      bookingCurrencyAmount: money,
      reason: z.string().trim().min(3),
    })
    .parse(Object.fromEntries(formData));
  const refund = await prisma.$transaction(async (tx) => {
    const allocation = await tx.paymentAllocation.findUniqueOrThrow({
      where: { id: data.allocationId },
      include: {
        payment: true,
        invoice: true,
        refunds: { where: { status: "RECORDED" } },
      },
    });
    if (allocation.reversedAt || allocation.payment.status !== "RECORDED") {
      throw new Error("A reversed allocation cannot be refunded.");
    }
    const amount = new Prisma.Decimal(data.bookingCurrencyAmount);
    const refunded = allocation.refunds.reduce(
      (sum, entry) => sum.plus(entry.bookingCurrencyAmount),
      new Prisma.Decimal(0),
    );
    if (!amount.isPositive() || refunded.plus(amount).greaterThan(allocation.invoiceCurrencyAmount)) {
      throw new Error("Refund cannot exceed the active allocation.");
    }
    const reference = await nextReference(tx, "refund", "REF");
    const created = await tx.refund.create({
      data: {
        reference,
        bookingId: allocation.payment.bookingId,
        customerId: allocation.payment.customerId,
        paymentId: allocation.paymentId,
        allocationId: allocation.id,
        invoiceId: allocation.invoiceId,
        refundDate: parseDate(data.refundDate, "refund date"),
        paymentCurrencyCode: allocation.payment.paymentCurrencyCode,
        paymentCurrencyAmount: amount.div(allocation.exchangeRate),
        bookingCurrencyCode: allocation.invoice.currencyCode,
        exchangeRate: allocation.exchangeRate,
        bookingCurrencyAmount: amount,
        reason: data.reason,
        createdById: actor.id,
      },
    });
    await refreshInvoice(tx, allocation.invoiceId);
    await refreshBooking(tx, allocation.payment.bookingId);
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "refund.recorded",
      entityType: "Refund",
      entityId: created.id,
      next: { reference, amount: amount.toString(), reason: data.reason },
    });
    return created;
  });
  revalidatePath(`/bookings/${refund.bookingId}`);
  revalidatePath("/finance");
}

export async function reverseCustomerPaymentAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      paymentId: z.string().uuid(),
      reason: z.string().trim().min(3),
    })
    .parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.findUniqueOrThrow({
      where: { id: data.paymentId },
      include: {
        allocations: { where: { reversedAt: null } },
        refunds: { where: { status: "RECORDED" } },
      },
    });
    if (payment.status === "REVERSED") throw new Error("Payment is already reversed.");
    if (payment.refunds.length) {
      throw new Error("A payment with refunds cannot be reversed.");
    }
    const reversedAt = new Date();
    await tx.customerPayment.update({
      where: { id: payment.id },
      data: { status: "REVERSED", reversedAt, reversalReason: data.reason },
    });
    await tx.paymentAllocation.updateMany({
      where: { paymentId: payment.id, reversedAt: null },
      data: { reversedAt },
    });
    for (const allocation of payment.allocations) {
      await refreshInvoice(tx, allocation.invoiceId);
    }
    await refreshBooking(tx, payment.bookingId);
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "customer-payment.reversed",
      entityType: "CustomerPayment",
      entityId: payment.id,
      previous: { status: payment.status },
      next: { status: "REVERSED", reason: data.reason },
    });
  });
  revalidatePath("/finance");
}
