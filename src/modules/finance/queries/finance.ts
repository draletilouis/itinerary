import { prisma } from "@/server/db/prisma";

export async function getFinanceWorkspace() {
  const [
    invoices,
    payments,
    supplierBills,
    expenses,
    bookings,
    currencies,
    suppliers,
    tours,
  ] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        customer: { select: { fullName: true } },
        booking: { select: { reference: true, tour: { select: { name: true } } } },
      },
    }),
    prisma.customerPayment.findMany({
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        customer: { select: { fullName: true } },
        booking: {
          select: {
            reference: true,
            invoices: {
              where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } },
              orderBy: { dueDate: "asc" },
              select: { id: true, reference: true, balanceDue: true, currencyCode: true },
            },
          },
        },
        allocations: {
          where: { reversedAt: null },
          include: { invoice: { select: { reference: true } } },
        },
        refunds: { where: { status: "RECORDED" } },
      },
    }),
    prisma.supplierBill.findMany({
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: { supplier: { select: { name: true } }, tour: { select: { name: true } } },
    }),
    prisma.tourExpense.findMany({
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        tour: { select: { name: true, reference: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { fullName: true } },
        tour: { select: { name: true } },
        invoices: {
          where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } },
          orderBy: { dueDate: "asc" },
        },
      },
    }),
    prisma.currency.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.supplier.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.tour.findMany({
      where: { status: { notIn: ["ARCHIVED"] } },
      orderBy: { startDate: "desc" },
      take: 100,
      select: {
        id: true,
        reference: true,
        name: true,
        costingCurrencyCode: true,
      },
    }),
  ]);



  return {
    invoices,
    payments,
    supplierBills,
    expenses,
    bookings,
    currencies,
    suppliers,
    tours,
    metrics: {
      openInvoices: invoices.filter((item) =>
        ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(item.status),
      ).length,
      openSupplierBills: supplierBills.filter((item) =>
        ["RECEIVED", "PARTIALLY_PAID", "OVERDUE"].includes(item.status),
      ).length,
      recordedPayments: payments.filter((item) => item.status === "RECORDED").length,
      recordedExpenses: expenses.filter((item) => item.status === "RECORDED").length,
    },
  };
}
