import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

type Rate = {
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  rate: Prisma.Decimal;
  effectiveAt: Date;
  expiresAt: Date | null;
};

function effectiveRate(rates: Rate[], source: string, target: string, at: Date) {
  if (source === target) return new Prisma.Decimal(1);
  const direct = rates.find(
    (rate) =>
      rate.baseCurrencyCode === source &&
      rate.quoteCurrencyCode === target &&
      rate.effectiveAt <= at &&
      (!rate.expiresAt || rate.expiresAt >= at),
  );
  if (direct) return direct.rate;
  const inverse = rates.find(
    (rate) =>
      rate.baseCurrencyCode === target &&
      rate.quoteCurrencyCode === source &&
      rate.effectiveAt <= at &&
      (!rate.expiresAt || rate.expiresAt >= at),
  );
  return inverse ? new Prisma.Decimal(1).div(inverse.rate) : null;
}

function convert(
  rates: Rate[],
  amount: Prisma.Decimal,
  source: string,
  target: string,
  at: Date,
) {
  const rate = effectiveRate(rates, source, target, at);
  return rate ? amount.mul(rate) : null;
}

function sum(values: Array<Prisma.Decimal | null>) {
  return values.reduce<Prisma.Decimal>(
    (total, value) => (value ? total.plus(value) : total),
    new Prisma.Decimal(0),
  );
}

export async function getReportsWorkspace() {
  const asOf = new Date();
  const [
    company,
    rates,
    enquiries,
    tours,
    bookings,
    invoices,
    allocations,
    supplierBills,
    expenses,
    assignments,
    incidents,
  ] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { singletonKey: "primary" } }),
    prisma.exchangeRate.findMany({
      where: { effectiveAt: { lte: asOf } },
      orderBy: { effectiveAt: "desc" },
    }),
    prisma.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.tour.findMany({
      select: {
        id: true,
        reference: true,
        name: true,
        status: true,
        startDate: true,
        costingCurrencyCode: true,
        actualRevenue: true,
        actualCost: true,
        actualProfit: true,
        actualMargin: true,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.invoice.findMany({
      where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
      select: {
        reference: true,
        currencyCode: true,
        total: true,
        balanceDue: true,
        issueDate: true,
        dueDate: true,
        status: true,
        customer: { select: { fullName: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.paymentAllocation.findMany({
      where: { payment: { status: "RECORDED" } },
      select: {
        invoiceCurrencyAmount: true,
        createdAt: true,
        invoice: { select: { currencyCode: true } },
        refunds: {
          select: { bookingCurrencyAmount: true, refundDate: true },
        },
      },
    }),
    prisma.supplierBill.findMany({
      where: { status: { notIn: ["CANCELLED", "PAID"] } },
      select: {
        reference: true,
        currencyCode: true,
        total: true,
        balanceDue: true,
        issueDate: true,
        dueDate: true,
        status: true,
        supplier: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.tourExpense.findMany({
      where: { status: "RECORDED" },
      select: {
        reference: true,
        convertedAmount: true,
        costingCurrencyCode: true,
        expenseDate: true,
        category: true,
        description: true,
        tour: { select: { reference: true, name: true } },
      },
      orderBy: { expenseDate: "desc" },
    }),
    prisma.resourceAssignment.groupBy({
      by: ["resourceType", "status"],
      _count: { _all: true },
    }),
    prisma.tourIncident.groupBy({
      by: ["severity", "status"],
      _count: { _all: true },
    }),
  ]);

  const reportingCurrency = company?.reportingCurrencyCode ?? "UGX";
  let unresolvedConversions = 0;
  const converted = (
    amount: Prisma.Decimal,
    currency: string,
    date: Date,
  ) => {
    const value = convert(rates, amount, currency, reportingCurrency, date);
    if (!value) unresolvedConversions += 1;
    return value;
  };

  const revenueEntries = allocations.map((allocation) => {
    const refunded = allocation.refunds.reduce(
      (total, refund) => total.plus(refund.bookingCurrencyAmount),
      new Prisma.Decimal(0),
    );
    return converted(
      Prisma.Decimal.max(
        allocation.invoiceCurrencyAmount.minus(refunded),
        new Prisma.Decimal(0),
      ),
      allocation.invoice.currencyCode,
      allocation.createdAt,
    );
  });
  const receivableEntries = invoices
    .filter((invoice) => invoice.balanceDue.isPositive())
    .map((invoice) =>
      converted(
        invoice.balanceDue,
        invoice.currencyCode,
        invoice.issueDate,
      ),
    );
  const payableEntries = supplierBills
    .filter((bill) => bill.balanceDue.isPositive())
    .map((bill) =>
      converted(bill.balanceDue, bill.currencyCode, bill.issueDate),
    );
  const expenseEntries = expenses.map((expense) =>
    converted(
      expense.convertedAmount,
      expense.costingCurrencyCode,
      expense.expenseDate,
    ),
  );
  const profitEntries = tours.map((tour) =>
    converted(
      tour.actualProfit,
      tour.costingCurrencyCode,
      tour.startDate,
    ),
  );

  const tourProfitability = tours.map((tour) => ({
    ...tour,
    reportingRevenue: converted(
      tour.actualRevenue,
      tour.costingCurrencyCode,
      tour.startDate,
    ),
    reportingCost: converted(
      tour.actualCost,
      tour.costingCurrencyCode,
      tour.startDate,
    ),
    reportingProfit: converted(
      tour.actualProfit,
      tour.costingCurrencyCode,
      tour.startDate,
    ),
  }));

  return {
    asOf,
    reportingCurrency,
    metrics: {
      netRevenue: sum(revenueEntries),
      receivables: sum(receivableEntries),
      payables: sum(payableEntries),
      expenses: sum(expenseEntries),
      actualProfit: sum(profitEntries),
      unresolvedConversions,
    },
    enquiryPipeline: enquiries.map((entry) => ({
      status: entry.status,
      count: entry._count._all,
    })),
    bookingStatuses: bookings.map((entry) => ({
      status: entry.status,
      count: entry._count._all,
    })),
    tourProfitability,
    invoices,
    supplierBills,
    expenses: expenses.slice(0, 100),
    resourceUtilisation: assignments.map((entry) => ({
      resourceType: entry.resourceType,
      status: entry.status,
      count: entry._count._all,
    })),
    incidentSummary: incidents.map((entry) => ({
      severity: entry.severity,
      status: entry.status,
      count: entry._count._all,
    })),
  };
}

export type ReportsWorkspace = Awaited<ReturnType<typeof getReportsWorkspace>>;
