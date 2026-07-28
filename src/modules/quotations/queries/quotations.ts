import { prisma } from "@/server/db/prisma";

export async function listQuotations() {
  return prisma.quotation.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { fullName: true } },
      tour: { select: { name: true, reference: true } },
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });
}

export async function getQuotation(id: string) {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      tour: { include: { booking: { select: { id: true, reference: true } } } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          lines: { orderBy: { sortOrder: "asc" } },
          itineraryVersion: {
            include: {
              days: {
                orderBy: { dayNumber: "asc" },
                include: {
                  destination: { select: { name: true } },
                  items: { orderBy: { sortOrder: "asc" } },
                },
              },
            },
          },
          pricing: { include: { tour: { include: { marginSetting: true } } } },
          createdBy: { select: { fullName: true } },
          costSnapshots: true,
          exchangeRateSnapshots: true,
        },
      },
    },
  });
}

export async function getTourQuotationWorkspace(tourId: string) {
  return prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      customer: true,
      booking: { select: { id: true } },
      pricingSnapshots: { orderBy: { revision: "desc" }, take: 1 },
      itineraries: {
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      quotations: {
        orderBy: { updatedAt: "desc" },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      },
    },
  });
}
