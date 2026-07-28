import { prisma } from "@/server/db/prisma";

export async function listTours(search = "") {
  return prisma.tour.findMany({
    where: search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { customer: { fullName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    include: {
      customer: { select: { fullName: true } },
      owner: { select: { fullName: true } },
      sourceEnquiry: { select: { id: true, reference: true } },
    },
  });
}

export async function getTour(id: string) {
  return prisma.tour.findUnique({
    where: { id },
    include: {
      customer: true,
      owner: { select: { fullName: true, email: true } },
      sourceEnquiry: { select: { id: true, reference: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { fullName: true } } },
      },
      booking: true,
      sourcePackage: { select: { id: true, reference: true, name: true, revision: true } },
      itineraries: {
        where: { archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: { id: true, versionNumber: true, status: true, title: true },
          },
        },
      },
      costItems: {
        where: { isEstimate: true },
        orderBy: { updatedAt: "desc" },
        select: { id: true, archivedAt: true, updatedAt: true },
      },
      pricingSnapshots: {
        orderBy: { revision: "desc" },
        take: 1,
        select: { id: true, revision: true, createdAt: true },
      },
      quotations: {
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, reference: true, status: true },
      },
      costingCurrency: true,
      quotationCurrency: true,
    },
  });
}
