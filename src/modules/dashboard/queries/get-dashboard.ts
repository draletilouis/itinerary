import { prisma } from "@/server/db/prisma";

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
    prisma.tour.aggregate({
      where: { startDate: { gte: monthStart }, status: { not: "CANCELLED" } },
      _sum: { actualRevenue: true },
    }),
    prisma.booking.aggregate({
      where: { balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
      _sum: { balanceDue: true },
    }),
    prisma.tour.aggregate({
      where: { status: { notIn: ["CANCELLED", "ARCHIVED"] } },
      _sum: { estimatedProfit: true },
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

  return {
    connected: true,
    metrics: {
      activeTours,
      upcomingTours,
      openEnquiries,
      confirmedBookings,
      revenueThisMonth: revenue._sum.actualRevenue?.toString() ?? "0",
      outstandingPayments: outstanding._sum.balanceDue?.toString() ?? "0",
      estimatedProfit: estimatedProfit._sum.estimatedProfit?.toString() ?? "0",
      schedulingConflicts: 0,
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
      },
      timeline: [],
      overdueFollowUps: [],
    };
  }
}
