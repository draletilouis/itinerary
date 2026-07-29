import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { CalculationBasis } from "../types";

type RateCandidate = {
  amount: Prisma.Decimal;
  currencyCode: string;
  supplierId: string | null;
  startDate: Date;
  endDate: Date | null;
};

export type ItineraryCostSuggestion = {
  itineraryItemId: string;
  itineraryDayId: string;
  dayNumber: number;
  date: Date;
  type: string;
  title: string;
  status: "READY" | "UNMATCHED" | "IMPORTED";
  reason?: string;
  category: string;
  basis?: CalculationBasis;
  unitCost?: string;
  estimatedTotal?: string;
  currencyCode?: string;
  supplierId?: string;
  supplierName?: string;
  rateLabel?: string;
  quantity: string;
  days: string;
  nights: string;
  rooms: string;
  vehicles: string;
  eligibleTravellers: string;
};

export function isRateEffective(
  rate: Pick<RateCandidate, "startDate" | "endDate">,
  date: Date,
) {
  return rate.startDate <= date && (!rate.endDate || rate.endDate >= date);
}

export function basisFromRateUnit(value: string): CalculationBasis {
  const normalized = value.toLowerCase();
  if (normalized.includes("room") || normalized.includes("night")) return "ACCOMMODATION";
  if (normalized.includes("person") || normalized.includes("traveller") || normalized.includes("guest")) return "PER_PERSON";
  if (normalized.includes("vehicle")) return "VEHICLE";
  return "STANDARD";
}

export function estimateSuggestionTotal(input: {
  basis: CalculationBasis;
  unitCost: string;
  quantity: string;
  days: string;
  nights: string;
  rooms: string;
  vehicles: string;
  eligibleTravellers: string;
}) {
  const unitCost = new Prisma.Decimal(input.unitCost);
  switch (input.basis) {
    case "ACCOMMODATION":
      return unitCost.mul(input.rooms).mul(input.nights).toString();
    case "PER_PERSON":
      return unitCost.mul(input.eligibleTravellers).toString();
    case "VEHICLE":
      return unitCost.mul(input.vehicles).mul(input.days).toString();
    default:
      return unitCost.mul(input.quantity).mul(input.days).toString();
  }
}
export async function getItineraryCostSuggestions(
  tourId: string,
): Promise<{ tourId: string; suggestions: ItineraryCostSuggestion[] }> {
  const tour = await prisma.tour.findUniqueOrThrow({
    where: { id: tourId },
    select: {
      id: true,
      startDate: true,
      adults: true,
      children: true,
      itineraries: {
        where: { archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, currentVersionNumber: true },
      },
    },
  });
  const itinerary = tour.itineraries[0];
  if (!itinerary) return { tourId, suggestions: [] };

  const version = await prisma.itineraryVersion.findUnique({
    where: {
      itineraryId_versionNumber: {
        itineraryId: itinerary.id,
        versionNumber: itinerary.currentVersionNumber,
      },
    },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              supplier: { select: { id: true, name: true, rates: { where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } } } },
              activity: { include: { rates: { where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } } } },
              accommodation: {
                include: {
                  rates: {
                    where: { status: "ACTIVE" },
                    orderBy: [{ startDate: "desc" }, { amount: "asc" }],
                    include: { roomType: { select: { name: true, maximumOccupancy: true } }, supplier: { select: { name: true } } },
                  },
                },
              },
              importedCostItem: { select: { id: true, archivedAt: true } },
            },
          },
        },
      },
    },
  });
  if (!version) return { tourId, suggestions: [] };

  const travellers = Math.max(1, tour.adults + tour.children);
  const suggestions: ItineraryCostSuggestion[] = [];
  for (const day of version.days) {
    const rateDate = day.date ?? tour.startDate;
    for (const item of day.items) {
      const common = {
        itineraryItemId: item.id,
        itineraryDayId: day.id,
        dayNumber: day.dayNumber,
        date: rateDate,
        type: item.type,
        title: item.title,
        category: categoryForType(item.type),
        quantity: "1",
        days: "1",
        nights: "0",
        rooms: "0",
        vehicles: "0",
        eligibleTravellers: "0",
      };
      const supplierRates = (item.supplier?.rates ?? []).filter((rate) =>
        isRateEffective(rate, rateDate),
      );
      const supplierFallback = (): ItineraryCostSuggestion | null => {
        if (!supplierRates.length) return null;
        const rate = supplierRates[0];
        const basis = basisFromRateUnit(`${rate.service} ${rate.unit}`);
        return {
          ...common,
          status: "READY",
          basis,
          unitCost: rate.amount.toString(),
          currencyCode: rate.currencyCode,
          supplierId: item.supplierId ?? undefined,
          supplierName: item.supplier?.name,
          rateLabel: `${rate.service} - ${rate.unit}`,
          nights: basis === "ACCOMMODATION" ? "1" : "0",
          rooms: basis === "ACCOMMODATION" ? String(Math.ceil(travellers / 2)) : "0",
          vehicles: basis === "VEHICLE" ? "1" : "0",
          eligibleTravellers: basis === "PER_PERSON" ? String(travellers) : "0",
        };
      };
      if (item.importedCostItem && !item.importedCostItem.archivedAt) {
        suggestions.push({ ...common, status: "IMPORTED", reason: "Already imported" });
        continue;
      }

      if (item.type === "ACTIVITY" && item.activity) {
        const rates = item.activity.rates.filter((rate) => isRateEffective(rate, rateDate));
        const rate = rates[0];
        if (!rate) {
          const fallback = supplierFallback();
          suggestions.push(fallback ?? {
            ...common,
            status: "UNMATCHED",
            reason: "No active activity or supplier rate for this date",
          });
          continue;
        }
        const basis = basisFromRateUnit(rate.rateType);
        suggestions.push({
          ...common,
          status: "READY",
          basis,
          unitCost: rate.amount.toString(),
          currencyCode: rate.currencyCode,
          supplierId: rate.supplierId ?? item.supplierId ?? undefined,
          supplierName: item.supplier?.name,
          rateLabel: rate.rateType,
          eligibleTravellers: basis === "PER_PERSON" ? String(travellers) : "0",
        });
        continue;
      }

      if (item.type === "ACCOMMODATION" && item.accommodation) {
        const rates = item.accommodation.rates.filter((rate) => isRateEffective(rate, rateDate));
        if (!rates.length) {
          const fallback = supplierFallback();
          suggestions.push(fallback ?? {
            ...common,
            status: "UNMATCHED",
            reason: "No active accommodation or supplier rate for this date",
          });
          continue;
        }
        if (rates.length > 1) {
          suggestions.push({
            ...common,
            status: "UNMATCHED",
            reason: "Multiple room rates apply; select the correct room rate manually",
          });
          continue;
        }
        const rate = rates[0];
        suggestions.push({
          ...common,
          status: "READY",
          basis: "ACCOMMODATION",
          unitCost: rate.amount.toString(),
          currencyCode: rate.currencyCode,
          supplierId: rate.supplierId ?? item.supplierId ?? undefined,
          supplierName: rate.supplier?.name ?? item.supplier?.name,
          rateLabel: `${rate.roomType.name} - ${rate.mealPlan} - ${rate.occupancy}`,
          nights: "1",
          rooms: String(Math.ceil(travellers / Math.max(1, rate.roomType.maximumOccupancy))),
        });
        continue;
      }

      const fallback = supplierFallback();
      if (fallback) {
        suggestions.push(fallback);
      } else {
        suggestions.push({
          ...common,
          status: "UNMATCHED",
          reason: !item.supplierId
            ? "No supplier is linked to this itinerary item"
            : supplierRates.length
              ? "Multiple supplier rates apply; choose the correct rate manually"
              : "No active supplier rate for this date",
        });
      }
    }
  }
  return {
    tourId,
    suggestions: suggestions.map((item) =>
      item.status === "READY" && item.basis && item.unitCost
        ? { ...item, estimatedTotal: estimateSuggestionTotal({ ...item, basis: item.basis, unitCost: item.unitCost }) }
        : item,
    ),
  };
}

function categoryForType(type: string) {
  switch (type) {
    case "ACCOMMODATION": return "Accommodation";
    case "ACTIVITY": return "Activities";
    case "TRANSPORT": return "Transport";
    case "MEAL": return "Meals";
    default: return "Other";
  }
}
