import { prisma } from "@/server/db/prisma";

export async function getTourCosting(tourId: string) {
  const [tour, suppliers, currencies, itineraryDays] = await Promise.all([
    prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        customer: { select: { fullName: true } },
        booking: { select: { id: true } },
        itineraries: { where: { archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { id: true } },
        costItems: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          include: { supplier: { select: { name: true } } },
        },
        pricingSnapshots: { orderBy: { revision: "desc" }, take: 10 },
        marginSetting: true,
      },
    }),
    prisma.supplier.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.currency.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.itineraryDay.findMany({
      where: { version: { itinerary: { tourId }, status: "DRAFT" } },
      orderBy: { dayNumber: "asc" },
      select: { id: true, dayNumber: true, title: true },
    }),
  ]);
  return { tour, suppliers, currencies, itineraryDays };
}
