"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { prisma } from "@/server/db/prisma";
import { calculateCostItem } from "../services/pricing";
import { resolveExchangeRate } from "../services/exchange-rates";
import { getItineraryCostSuggestions } from "../services/itinerary-cost-import";

export async function importItineraryCostsAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const tourId = z.string().uuid().parse(formData.get("tourId"));
  const selectedIds = z.array(z.string().uuid()).parse(formData.getAll("itemId"));
  if (!selectedIds.length) throw new Error("Select at least one matched itinerary item.");

  const [tour, review] = await Promise.all([
    prisma.tour.findUniqueOrThrow({ where: { id: tourId } }),
    getItineraryCostSuggestions(tourId),
  ]);
  const selected = review.suggestions.filter(
    (item) => selectedIds.includes(item.itineraryItemId) && item.status === "READY",
  );
  if (selected.length !== new Set(selectedIds).size) {
    throw new Error("One or more selected items are no longer importable. Refresh and review the suggestions.");
  }

  const prepared = await Promise.all(
    selected.map(async (item) => {
      if (!item.basis || !item.unitCost || !item.currencyCode) {
        throw new Error(`The rate for ${item.title} is incomplete.`);
      }
      const exchangeRate = await resolveExchangeRate(
        item.currencyCode,
        tour.costingCurrencyCode,
        item.date,
      );
      const result = calculateCostItem({
        category: item.category,
        basis: item.basis,
        unitCost: item.unitCost,
        quantity: item.quantity,
        days: item.days,
        nights: item.nights,
        rooms: item.rooms,
        vehicles: item.vehicles,
        eligibleTravellers: item.eligibleTravellers,
        taxPercentage: "0",
        commissionPercentage: "0",
        exchangeRate,
      });
      return { item, exchangeRate, result };
    }),
  );

  await prisma.$transaction(async (tx) => {
    for (const { item, exchangeRate, result } of prepared) {
      await tx.tourCostItem.upsert({
        where: { sourceItineraryItemId: item.itineraryItemId },
        update: {
          tourId,
          itineraryDayId: item.itineraryDayId,
          supplierId: item.supplierId ?? null,
          category: item.category,
          description: item.title,
          basis: item.basis!,
          unitCost: new Prisma.Decimal(item.unitCost!),
          quantity: new Prisma.Decimal(item.quantity),
          days: new Prisma.Decimal(item.days),
          nights: new Prisma.Decimal(item.nights),
          rooms: new Prisma.Decimal(item.rooms),
          vehicles: new Prisma.Decimal(item.vehicles),
          eligibleTravellers: new Prisma.Decimal(item.eligibleTravellers),
          taxPercentage: 0,
          commissionPercentage: 0,
          overrideTotal: null,
          overrideReason: null,
          originalCurrencyCode: item.currencyCode!,
          originalTotal: result.originalTotal,
          exchangeRate,
          exchangeRateDate: item.date,
          convertedCurrencyCode: tour.costingCurrencyCode,
          convertedTotal: result.baseCurrencyTotal,
          isEstimate: true,
          archivedAt: null,
          createdById: actor.id,
        },
        create: {
          tourId,
          itineraryDayId: item.itineraryDayId,
          sourceItineraryItemId: item.itineraryItemId,
          supplierId: item.supplierId ?? null,
          category: item.category,
          description: item.title,
          basis: item.basis!,
          unitCost: new Prisma.Decimal(item.unitCost!),
          quantity: new Prisma.Decimal(item.quantity),
          days: new Prisma.Decimal(item.days),
          nights: new Prisma.Decimal(item.nights),
          rooms: new Prisma.Decimal(item.rooms),
          vehicles: new Prisma.Decimal(item.vehicles),
          eligibleTravellers: new Prisma.Decimal(item.eligibleTravellers),
          originalCurrencyCode: item.currencyCode!,
          originalTotal: result.originalTotal,
          exchangeRate,
          exchangeRateDate: item.date,
          convertedCurrencyCode: tour.costingCurrencyCode,
          convertedTotal: result.baseCurrencyTotal,
          createdById: actor.id,
        },
      });
    }
    const total = await tx.tourCostItem.aggregate({
      where: { tourId, archivedAt: null, isEstimate: true },
      _sum: { convertedTotal: true },
    });
    await tx.tour.update({
      where: { id: tourId },
      data: { estimatedInternalCost: total._sum.convertedTotal ?? 0, status: "COSTING" },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour.itinerary-costs-imported",
      entityType: "Tour",
      entityId: tourId,
      next: {
        count: prepared.length,
        itineraryItemIds: prepared.map(({ item }) => item.itineraryItemId),
      },
    });
  });

  revalidatePath(`/tours/${tourId}/costing`);
  revalidatePath(`/tours/${tourId}`);
}
