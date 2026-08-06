import { prisma } from "@/server/db/prisma";
import { getItineraryCostSuggestions } from "../services/itinerary-cost-import";
import { getPricingCurrencyCodes } from "../services/pricing-currencies";

export async function getTourCosting(tourId: string) {
  const pricingCurrencyCodes = await getPricingCurrencyCodes();
  const [tour, suppliers, currencies, itineraryDays, itineraryCostReview] = await Promise.all([
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
    prisma.supplier.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: {
        rates: {
          where: { status: "ACTIVE", currencyCode: { in: pricingCurrencyCodes } },
          orderBy: [{ startDate: "desc" }, { service: "asc" }],
        },
        accommodations: {
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
          include: {
            rates: {
              where: { status: "ACTIVE", currencyCode: { in: pricingCurrencyCodes } },
              orderBy: [{ startDate: "desc" }, { amount: "asc" }],
              include: { roomType: { select: { id: true, name: true, maximumOccupancy: true } } },
            },
          },
        },
      },
    }),
    prisma.currency.findMany({
      where: { active: true, code: { in: pricingCurrencyCodes } },
      orderBy: { code: "asc" },
    }),
    prisma.itineraryDay.findMany({
      where: { version: { itinerary: { tourId }, status: "DRAFT" } },
      orderBy: { dayNumber: "asc" },
      select: { id: true, dayNumber: true, title: true },
    }),
    getItineraryCostSuggestions(tourId),
  ]);
  const supplierOptions = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    serviceRates: supplier.rates.map((rate) => ({
      id: rate.id,
      service: rate.service,
      unit: rate.unit,
      amount: rate.amount.toString(),
      currencyCode: rate.currencyCode,
      startDate: rate.startDate.toISOString(),
      endDate: rate.endDate?.toISOString() ?? null,
      notes: rate.notes,
    })),

    roomRates: supplier.accommodations.flatMap((accommodation) =>
      accommodation.rates.map((rate) => ({
        id: rate.id,
        accommodationName: accommodation.name,
        roomTypeName: rate.roomType.name,
        maximumOccupancy: rate.roomType.maximumOccupancy,
        occupancyGuests: rate.occupancyGuests,
        mealPlan: rate.mealPlan,
        amount: rate.amount.toString(),
        currencyCode: rate.currencyCode,
        startDate: rate.startDate.toISOString(),
        endDate: rate.endDate?.toISOString() ?? null,
      })),
    ),
  }));
  return { tour, suppliers: supplierOptions, currencies, itineraryDays, itineraryCostReview };
}
