import { prisma } from "@/server/db/prisma";

export async function listBookings(search = "") {
  return prisma.booking.findMany({
    where: search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { tour: { name: { contains: search, mode: "insensitive" } } },
            { customer: { fullName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: [{ bookingDate: "desc" }, { createdAt: "desc" }],
    include: {
      customer: { select: { fullName: true } },
      tour: { select: { name: true, reference: true, startDate: true, endDate: true } },
      leadTraveller: { select: { fullName: true } },
      _count: { select: { travellers: true } },
    },
  });
}

export async function getBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      customer: {
        include: {
          travellers: { orderBy: { fullName: "asc" } },
        },
      },
      tour: true,
      leadTraveller: true,
      createdBy: { select: { fullName: true } },
      acceptedQuotationVersion: {
        include: {
          quotation: { select: { id: true, reference: true } },
        },
      },
      acceptedItineraryVersion: {
        include: {
          itinerary: { select: { id: true, reference: true, title: true } },
        },
      },
      travellers: {
        orderBy: [{ isLead: "desc" }, { createdAt: "asc" }],
        include: { traveller: true },
      },
      paymentSchedule: {
        orderBy: { sequence: "asc" },
        include: { invoice: { select: { id: true, reference: true, status: true } } },
      },
    },
  });
}
