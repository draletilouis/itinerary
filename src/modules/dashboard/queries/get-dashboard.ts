import { prisma } from "@/server/db/prisma";
import { convertDashboardTotals } from "../presentation";

const activeTourStatuses = [
  "CONFIRMED",
  "OPERATIONAL_PREPARATION",
  "READY",
  "IN_PROGRESS",
] as const;

const openEnquiryStatuses = [
  "NEW",
  "CONTACTED",
  "QUALIFYING",
  "PLANNING",
  "QUOTATION_SENT",
  "NEGOTIATION",
] as const;

export type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;

async function loadDashboardData() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setUTCDate(thirtyDaysFromNow.getUTCDate() + 30);

  const [
    activeTours,
    upcomingTours,
    openEnquiries,
    confirmedBookings,
    revenue,
    outstanding,
    estimatedProfit,
    exchangeRates,
    timeline,
    overdueFollowUps,
  ] = await Promise.all([
    prisma.tour.count({ where: { status: { in: [...activeTourStatuses] } } }),
    prisma.tour.count({
      where: {
        startDate: { gte: now, lte: thirtyDaysFromNow },
        status: { notIn: ["CANCELLED", "ARCHIVED"] },
      },
    }),
    prisma.enquiry.count({ where: { status: { in: [...openEnquiryStatuses] } } }),
    prisma.booking.count({
      where: {
        status: {
          in: ["CONFIRMED", "PARTIALLY_PAID", "FULLY_PAID", "IN_OPERATION"],
        },
      },
    }),
    prisma.tour.groupBy({
      by: ["costingCurrencyCode"],
      where: { startDate: { gte: monthStart }, status: { not: "CANCELLED" } },
      _sum: { actualRevenue: true },
      orderBy: { costingCurrencyCode: "asc" },
    }),
    prisma.booking.groupBy({
      by: ["currencyCode"],
      where: { balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
      _sum: { balanceDue: true },
      orderBy: { currencyCode: "asc" },
    }),
    prisma.tour.groupBy({
      by: ["quotationCurrencyCode"],
      where: { status: { notIn: ["CANCELLED", "ARCHIVED"] } },
      _sum: { estimatedProfit: true },
      orderBy: { quotationCurrencyCode: "asc" },
    }),
    prisma.exchangeRate.findMany({
      where: { effectiveAt: { lte: now } },
      orderBy: { effectiveAt: "desc" },
    }),
    prisma.tour.findMany({
      where: {
        OR: [
          { startDate: { gte: now, lte: thirtyDaysFromNow } },
          { status: "IN_PROGRESS" },
        ],
        status: { notIn: ["CANCELLED", "ARCHIVED"] },
      },
      orderBy: { startDate: "asc" },
      take: 6,
      select: {
        id: true,
        reference: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        customer: { select: { fullName: true } },
      },
    }),
    prisma.enquiry.findMany({
      where: {
        followUpAt: { lt: now },
        status: { in: [...openEnquiryStatuses] },
      },
      orderBy: { followUpAt: "asc" },
      take: 6,
      select: {
        id: true,
        reference: true,
        followUpAt: true,
        customer: { select: { fullName: true } },
      },
    }),
  ]);

  const reportingCurrency = "UGX";
  const revenueInUgx = convertDashboardTotals(
    revenue.map((entry) => ({ currencyCode: entry.costingCurrencyCode, amount: entry._sum.actualRevenue?.toString() ?? "0" })),
    exchangeRates, reportingCurrency, now,
  );
  const outstandingInUgx = convertDashboardTotals(
    outstanding.map((entry) => ({ currencyCode: entry.currencyCode, amount: entry._sum.balanceDue?.toString() ?? "0" })),
    exchangeRates, reportingCurrency, now,
  );
  const estimatedProfitInUgx = convertDashboardTotals(
    estimatedProfit.map((entry) => ({ currencyCode: entry.quotationCurrencyCode, amount: entry._sum.estimatedProfit?.toString() ?? "0" })),
    exchangeRates, reportingCurrency, now,
  );
  const unresolvedCurrencies = [...new Set([
    ...revenueInUgx.unresolvedCurrencies,
    ...outstandingInUgx.unresolvedCurrencies,
    ...estimatedProfitInUgx.unresolvedCurrencies,
  ])];

  return {
    connected: true,
    metrics: {
      activeTours,
      upcomingTours,
      openEnquiries,
      confirmedBookings,
      revenueThisMonth: revenueInUgx.total.toString(),
      outstandingPayments: outstandingInUgx.total.toString(),
      estimatedProfit: estimatedProfitInUgx.total.toString(),
      schedulingConflicts: 0,
      reportingCurrency,
      unresolvedCurrencies,
    },
    timeline,
    overdueFollowUps,
  };
}

export async function getDashboardData() {
  try {
    return await loadDashboardData();
  } catch {
    return {
      connected: false,
      metrics: {
        activeTours: 0,
        upcomingTours: 0,
        openEnquiries: 0,
        confirmedBookings: 0,
        revenueThisMonth: "0",
        outstandingPayments: "0",
        estimatedProfit: "0",
        schedulingConflicts: 0,
        reportingCurrency: "UGX",
        unresolvedCurrencies: [],
      },
      timeline: [],
      overdueFollowUps: [],
    };
  }
}
