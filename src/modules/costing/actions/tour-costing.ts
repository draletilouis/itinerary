"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { calculateCostItem, calculateSellingPrice } from "../services/pricing";
import { resolveExchangeRate } from "../services/exchange-rates";
import { assertPricingCurrencyAvailable } from "../services/pricing-currencies";

const number = z.string().trim().regex(/^\d+(\.\d+)?$/);
const optionalNumber = z.string().trim().optional().default("").refine((value) => !value || /^\d+(\.\d+)?$/.test(value));

export async function addTourCostItemAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z.object({
    tourId: z.string().uuid(),
    category: z.string().trim().min(2),
    description: z.string().trim().min(2),
    basis: z.enum(["STANDARD", "ACCOMMODATION", "PER_PERSON", "VEHICLE", "OVERRIDE"]),
    unitCost: number,
    quantity: optionalNumber,
    days: optionalNumber,
    nights: optionalNumber,
    rooms: optionalNumber,
    vehicles: optionalNumber,
    eligibleTravellers: optionalNumber,
    taxPercentage: optionalNumber,
    commissionPercentage: optionalNumber,
    overrideTotal: optionalNumber,
    overrideReason: z.string().trim().optional().default(""),
    originalCurrencyCode: z.string().length(3),
    exchangeRateDate: z.string().min(1),
    supplierId: z.string().optional().default(""),
    itineraryDayId: z.string().optional().default(""),
  }).parse(Object.fromEntries(formData));

  const tour = await prisma.tour.findUniqueOrThrow({ where: { id: data.tourId } });
  const rateDate = new Date(data.exchangeRateDate);
  const originalCurrencyCode = await assertPricingCurrencyAvailable(data.originalCurrencyCode);
  const exchangeRate = await resolveExchangeRate(originalCurrencyCode, tour.costingCurrencyCode, rateDate);
  const result = calculateCostItem({
    category: data.category,
    basis: data.basis,
    unitCost: data.unitCost,
    quantity: data.quantity || "1",
    days: data.days || "1",
    nights: data.nights || "0",
    rooms: data.rooms || "0",
    vehicles: data.vehicles || "0",
    eligibleTravellers: data.eligibleTravellers || "0",
    taxPercentage: data.taxPercentage || "0",
    commissionPercentage: data.commissionPercentage || "0",
    overrideTotal: data.overrideTotal || undefined,
    overrideReason: data.overrideReason || undefined,
    exchangeRate,
  });

  await prisma.$transaction(async (tx) => {
    const item = await tx.tourCostItem.create({
      data: {
        tourId: tour.id,
        category: data.category,
        description: data.description,
        basis: data.basis,
        unitCost: new Prisma.Decimal(data.unitCost),
        quantity: new Prisma.Decimal(data.quantity || 1),
        days: new Prisma.Decimal(data.days || 1),
        nights: new Prisma.Decimal(data.nights || 0),
        rooms: new Prisma.Decimal(data.rooms || 0),
        vehicles: new Prisma.Decimal(data.vehicles || 0),
        eligibleTravellers: new Prisma.Decimal(data.eligibleTravellers || 0),
        taxPercentage: new Prisma.Decimal(data.taxPercentage || 0),
        commissionPercentage: new Prisma.Decimal(data.commissionPercentage || 0),
        overrideTotal: data.overrideTotal ? new Prisma.Decimal(data.overrideTotal) : null,
        overrideReason: data.overrideReason || null,
        originalCurrencyCode,
        originalTotal: result.originalTotal,
        exchangeRate,
        exchangeRateDate: rateDate,
        convertedCurrencyCode: tour.costingCurrencyCode,
        convertedTotal: result.baseCurrencyTotal,
        supplierId: data.supplierId || null,
        itineraryDayId: data.itineraryDayId || null,
        createdById: actor.id,
      },
    });
    const total = await tx.tourCostItem.aggregate({
      where: { tourId: tour.id, archivedAt: null, isEstimate: true },
      _sum: { convertedTotal: true },
    });
    await tx.tour.update({
      where: { id: tour.id },
      data: { estimatedInternalCost: total._sum.convertedTotal ?? 0, status: "COSTING" },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour.cost-item-added",
      entityType: "TourCostItem",
      entityId: item.id,
      next: {
        tourId: tour.id,
        originalTotal: item.originalTotal.toString(),
        exchangeRate: item.exchangeRate.toString(),
        convertedTotal: item.convertedTotal.toString(),
      },
    });
  });
  revalidatePath(`/tours/${tour.id}/costing`);
  revalidatePath(`/tours/${tour.id}`);
}

export async function saveTourPricingAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z.object({
    tourId: z.string().uuid(),
    contingencyMethod: z.enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON", "PER_DAY"]),
    contingencyValue: optionalNumber,
    markupMethod: z.enum(["PERCENTAGE", "FIXED", "PER_PERSON", "TARGET_PRICE", "TARGET_MARGIN"]),
    markupValue: number,
    taxMethod: z.enum(["NONE", "PERCENTAGE", "FIXED"]),
    taxValue: optionalNumber,
    discountMethod: z.enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON"]),
    discountValue: optionalNumber,
    minimumMargin: optionalNumber,
    belowMinimumReason: z.string().trim().optional().default(""),
  }).parse(Object.fromEntries(formData));

  const tour = await prisma.tour.findUniqueOrThrow({ where: { id: data.tourId } });
  const costingToQuotationRate = await resolveExchangeRate(
    tour.costingCurrencyCode,
    tour.quotationCurrencyCode,
    new Date(),
  );
  const internalCostInQuotationCurrency = tour.estimatedInternalCost.mul(costingToQuotationRate);
  const result = calculateSellingPrice({
    internalCost: internalCostInQuotationCurrency,
    travellerCount: tour.adults + tour.children,
    tourDays: Math.round((tour.endDate.getTime() - tour.startDate.getTime()) / 86_400_000) + 1,
    contingencyMethod: data.contingencyMethod,
    contingencyValue: data.contingencyValue || 0,
    markupMethod: data.markupMethod,
    markupValue: data.markupValue,
    taxMethod: data.taxMethod,
    taxValue: data.taxValue || 0,
    discountMethod: data.discountMethod,
    discountValue: data.discountValue || 0,
    minimumMargin: data.minimumMargin || 0,
  });
  if (result.marginValidation.requiresApproval && !data.belowMinimumReason) {
    throw new Error("Enter a reason to continue below this tour's minimum margin.");
  }

  await prisma.$transaction(async (tx) => {
    const latest = await tx.tourPricing.aggregate({ where: { tourId: tour.id }, _max: { revision: true } });
    await tx.tourMarginSetting.upsert({
      where: { tourId: tour.id },
      update: { minimumMargin: data.minimumMargin ? new Prisma.Decimal(data.minimumMargin) : null, changedById: actor.id },
      create: { tourId: tour.id, minimumMargin: data.minimumMargin ? new Prisma.Decimal(data.minimumMargin) : null, changedById: actor.id },
    });
    const pricing = await tx.tourPricing.create({
      data: {
        tourId: tour.id,
        revision: (latest._max.revision ?? 0) + 1,
        currencyCode: tour.quotationCurrencyCode,
        internalCost: internalCostInQuotationCurrency,
        costingToQuotationRate,
        contingency: result.contingency,
        costAfterContingency: result.costAfterContingency,
        markupMethod: data.markupMethod,
        markupValue: new Prisma.Decimal(data.markupValue),
        markupAmount: result.markup,
        markupPercentage: result.markupPercentage,
        tax: result.tax,
        discount: result.discount,
        sellingPrice: result.finalSellingPrice,
        estimatedProfit: result.estimatedProfit,
        estimatedMargin: result.estimatedMargin,
        pricePerTraveller: result.pricePerTraveller,
        minimumMargin: data.minimumMargin ? new Prisma.Decimal(data.minimumMargin) : null,
        belowMinimumReason: data.belowMinimumReason || null,
        createdById: actor.id,
      },
    });
    await tx.tour.update({
      where: { id: tour.id },
      data: {
        sellingPrice: result.finalSellingPrice,
        estimatedProfit: result.estimatedProfit,
        estimatedMargin: result.estimatedMargin,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour.pricing-saved",
      entityType: "TourPricing",
      entityId: pricing.id,
      next: {
        revision: pricing.revision,
        sellingPrice: pricing.sellingPrice.toString(),
        margin: pricing.estimatedMargin.toString(),
        belowMinimumReason: pricing.belowMinimumReason,
      },
    });
  });
  revalidatePath(`/tours/${tour.id}/costing`);
  revalidatePath(`/tours/${tour.id}`);
}



