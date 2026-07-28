import { prisma } from "@/server/db/prisma";

export async function listItineraries() {
  return prisma.itinerary.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      tour: { select: { id: true, reference: true, name: true } },
      enquiry: { select: { id: true, reference: true } },
      createdBy: { select: { fullName: true } },
      _count: { select: { versions: true } },
    },
  });
}

export async function getItinerary(id: string) {
  return prisma.itinerary.findUnique({
    where: { id },
    include: {
      tour: { include: { customer: { select: { fullName: true } }, booking: { select: { id: true } } } },
      enquiry: { select: { id: true, reference: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          createdBy: { select: { fullName: true } },
          days: {
            orderBy: { dayNumber: "asc" },
            include: {
              destination: true,
              items: {
                orderBy: { sortOrder: "asc" },
                include: {
                  activity: { select: { name: true } },
                  accommodation: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getItineraryOptions(destinationIds?: string[]) {
  const destinationFilter = destinationIds
    ? { destinationId: { in: destinationIds } }
    : {};
  const [tours, destinations, activities, accommodations] = await Promise.all([
    prisma.tour.findMany({
      where: { status: { notIn: ["CANCELLED", "ARCHIVED"] }, itineraries: { none: { archivedAt: null } } },
      orderBy: { startDate: "asc" },
      include: { customer: { select: { fullName: true } } },
    }),
    prisma.destination.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.activity.findMany({
      where: { status: "ACTIVE", ...destinationFilter },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        destinationId: true,
        category: true,
        durationMinutes: true,
      },
    }),
    prisma.accommodation.findMany({
      where: { status: "ACTIVE", ...destinationFilter },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        destinationId: true,
        type: true,
      },
    }),
  ]);
  return { tours, destinations, activities, accommodations };
}
