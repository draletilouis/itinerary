"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";
import { createBookingFromAcceptedQuotation } from "@/modules/bookings/services/create-booking";
import {
  assertQuotationTransition,
  isQuotationExpired,
  parseFutureValidityDate,
} from "../services/lifecycle";
import { calculateQuotationRevision } from "../services/totals";
import { validateZeroMarginOverride } from "../services/margin-guard";
import {
  allocateQuotationAmount,
  buildItineraryQuotationLines,
  buildTravellerPricing,
} from "../services/presentation";

export async function generateQuotationAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z.object({
    tourId: z.string().uuid(),
    validUntil: z.string().min(1),
    presentationMode: z.enum(["ITEMIZED", "PER_TRAVELLER", "BOTH"]),
    adultUnitPrice: z.union([z.literal(""), z.string().trim().regex(/^\d+(\.\d{1,2})?$/)]).optional().default(""),
    childUnitPrice: z.union([z.literal(""), z.string().trim().regex(/^\d+(\.\d{1,2})?$/)]).optional().default(""),
    customerNotes: z.string().trim().optional().default(""),
    terms: z.string().trim().optional().default(""),
    zeroMarginReason: z.string().trim().optional().default(""),
  }).parse(Object.fromEntries(formData));
  const validUntil = parseFutureValidityDate(data.validUntil);

  const quotation = await prisma.$transaction(async (tx) => {
    const tour = await tx.tour.findUniqueOrThrow({
      where: { id: data.tourId },
      include: {
        customer: true,
        costItems: { where: { archivedAt: null, isEstimate: true } },
        pricingSnapshots: { orderBy: { revision: "desc" }, take: 1 },
        itineraries: {
          include: {
            versions: {
              where: { status: "PUBLISHED" },
              orderBy: { versionNumber: "desc" },
              take: 1,
              include: {
                days: {
                  orderBy: { dayNumber: "asc" },
                  include: { items: { orderBy: { sortOrder: "asc" } } },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
    const pricing = tour.pricingSnapshots[0];
    if (!pricing) throw new Error("Save tour pricing before generating a quotation.");
    validateZeroMarginOverride(pricing, data.zeroMarginReason);
    const itineraryVersion = tour.itineraries[0]?.versions[0];
    if (!itineraryVersion) {
      throw new Error("Publish an itinerary version before generating a quotation.");
    }
    const linkedCosts = new Map<string, import("@prisma/client").Prisma.Decimal>();
    for (const cost of tour.costItems) {
      if (!cost.sourceItineraryItemId) continue;
      linkedCosts.set(
        cost.sourceItineraryItemId,
        (linkedCosts.get(cost.sourceItineraryItemId) ?? cost.convertedTotal.mul(0)).plus(cost.convertedTotal),
      );
    }
    const quotationLines = buildItineraryQuotationLines({
      total: pricing.sellingPrice,
      fallbackTitle: tour.name,
      items: itineraryVersion.days.flatMap((day) =>
        day.items.map((item) => ({
          id: item.id,
          dayNumber: day.dayNumber,
          sortOrder: item.sortOrder,
          type: item.type,
          title: item.title,
          linkedCost: linkedCosts.get(item.id) ?? 0,
        })),
      ),
    });
    const travellerPricing = buildTravellerPricing({
      total: pricing.sellingPrice,
      adults: tour.adults,
      children: tour.children,
      adultUnitPrice: data.adultUnitPrice || null,
      childUnitPrice: data.childUnitPrice || null,
    });
    const reference = await nextReference(tx, "quotation", "QUO");
    const created = await tx.quotation.create({
      data: {
        reference,
        tourId: tour.id,
        customerId: tour.customerId,
        status: "GENERATED",
        createdById: actor.id,
      },
    });
    const subtotal = pricing.sellingPrice.minus(pricing.tax).plus(pricing.discount);
    const version = await tx.quotationVersion.create({
      data: {
        quotationId: created.id,
        versionNumber: 1,
        itineraryVersionId: itineraryVersion.id,
        pricingId: pricing.id,
        title: `${tour.name} Proposal`,
        issueDate: new Date(),
        validUntil,
        currencyCode: pricing.currencyCode,
        subtotal,
        tax: pricing.tax,
        discount: pricing.discount,
        total: pricing.sellingPrice,
        presentationMode: data.presentationMode,
        adultUnitPrice: travellerPricing.adultUnitPrice,
        childUnitPrice: travellerPricing.childUnitPrice,
        travellerAdjustment: travellerPricing.adjustment,
        internalCost: pricing.internalCost,
        estimatedProfit: pricing.estimatedProfit,
        estimatedMargin: pricing.estimatedMargin,
        customerNotes: data.customerNotes || null,
        terms: data.terms || itineraryVersion.terms,
        status: "GENERATED",
        createdById: actor.id,
      },
    });
    if (data.zeroMarginReason) {
      await writeAuditEvent(tx, { actorId: actor.id, action: "quotation.zero-margin-overridden", entityType: "Quotation", entityId: created.id, next: { reason: data.zeroMarginReason, internalCost: pricing.internalCost, sellingPrice: pricing.sellingPrice, estimatedMargin: pricing.estimatedMargin } });
    }
    await tx.quotationLine.createMany({
      data: quotationLines.map((line) => ({ ...line, versionId: version.id })),
    });
    for (const item of tour.costItems) {
      await tx.quotationCostSnapshot.create({
        data: {
          versionId: version.id,
          sourceCostItemId: item.id,
          category: item.category,
          description: item.description,
          originalCurrencyCode: item.originalCurrencyCode,
          originalTotal: item.originalTotal,
          exchangeRate: item.exchangeRate,
          exchangeRateDate: item.exchangeRateDate,
          convertedCurrencyCode: item.convertedCurrencyCode,
          convertedTotal: item.convertedTotal,
        },
      });
      await tx.quotationExchangeRateSnapshot.create({
        data: {
          versionId: version.id,
          sourceCurrencyCode: item.originalCurrencyCode,
          targetCurrencyCode: item.convertedCurrencyCode,
          rate: item.exchangeRate,
          effectiveAt: item.exchangeRateDate,
          purpose: `Cost: ${item.description}`,
        },
      });
    }
    await tx.quotationExchangeRateSnapshot.create({
      data: {
        versionId: version.id,
        sourceCurrencyCode: tour.costingCurrencyCode,
        targetCurrencyCode: tour.quotationCurrencyCode,
        rate: pricing.costingToQuotationRate,
        effectiveAt: pricing.createdAt,
        purpose: "Tour costing to quotation currency",
      },
    });
    await tx.tour.update({ where: { id: tour.id }, data: { status: "QUOTED" } });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "quotation.generated",
      entityType: "Quotation",
      entityId: created.id,
      next: {
        reference,
        version: 1,
        pricingId: pricing.id,
        itineraryVersionId: itineraryVersion.id,
        total: pricing.sellingPrice.toString(),
        presentationMode: data.presentationMode,
      },
    });
    return created;
  });
  redirect(`/quotations/${quotation.id}`);
}

export async function reviseQuotationAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z.object({
    quotationId: z.string().uuid(),
    subtotal: z.string().regex(/^\d+(\.\d+)?$/),
    tax: z.string().regex(/^\d+(\.\d+)?$/),
    discount: z.string().regex(/^\d+(\.\d+)?$/),
    validUntil: z.string().min(1),
    presentationMode: z.enum(["ITEMIZED", "PER_TRAVELLER", "BOTH"]),
    adultUnitPrice: z.union([z.literal(""), z.string().trim().regex(/^\d+(\.\d{1,2})?$/)]).optional().default(""),
    childUnitPrice: z.union([z.literal(""), z.string().trim().regex(/^\d+(\.\d{1,2})?$/)]).optional().default(""),
    customerNotes: z.string().trim().optional().default(""),
    terms: z.string().trim().optional().default(""),
    revisionReason: z.string().trim().min(2),
    belowMinimumReason: z.string().trim().optional().default(""),
  }).parse(Object.fromEntries(formData));
  const validUntil = parseFutureValidityDate(data.validUntil);

  await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUniqueOrThrow({
      where: { id: data.quotationId },
      include: {
        tour: { select: { adults: true, children: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            lines: true,
            costSnapshots: true,
            exchangeRateSnapshots: true,
            pricing: true,
          },
        },
      },
    });
    if (["ACCEPTED", "CANCELLED"].includes(quotation.status)) {
      throw new Error("Accepted or cancelled quotations cannot be revised.");
    }
    const source = quotation.versions[0];
    if (!source) throw new Error("Quotation version not found.");
    const totals = calculateQuotationRevision({
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      internalCost: source.internalCost,
    });
    const minimum = source.pricing.minimumMargin;
    if (minimum && totals.estimatedMargin.lessThan(minimum) && !data.belowMinimumReason) {
      throw new Error("Enter a reason to continue below the tour minimum margin.");
    }
    const travellerPricing = buildTravellerPricing({
      total: totals.total,
      adults: quotation.tour.adults,
      children: quotation.tour.children,
      adultUnitPrice: data.adultUnitPrice || null,
      childUnitPrice: data.childUnitPrice || null,
    });
    const pricedSourceLines = source.lines.filter((line) => line.total.greaterThan(0));
    const revisedAllocations = allocateQuotationAmount(
      totals.total,
      pricedSourceLines.map((line) => line.total),
    );
    const revisedTotalByLineId = new Map(
      pricedSourceLines.map((line, index) => [line.id, revisedAllocations[index]]),
    );
    await tx.quotationVersion.update({
      where: { id: source.id },
      data: { status: "SUPERSEDED" },
    });
    const version = await tx.quotationVersion.create({
      data: {
        quotationId: quotation.id,
        versionNumber: source.versionNumber + 1,
        itineraryVersionId: source.itineraryVersionId,
        pricingId: source.pricingId,
        title: source.title,
        issueDate: new Date(),
        validUntil,
        currencyCode: source.currencyCode,
        ...totals,
        presentationMode: data.presentationMode,
        adultUnitPrice: travellerPricing.adultUnitPrice,
        childUnitPrice: travellerPricing.childUnitPrice,
        travellerAdjustment: travellerPricing.adjustment,
        customerNotes: data.customerNotes || source.customerNotes,
        terms: data.terms || source.terms,
        revisionReason: `${data.revisionReason}${data.belowMinimumReason ? `; Below minimum: ${data.belowMinimumReason}` : ""}`,
        status: "GENERATED",
        createdById: actor.id,
      },
    });
    for (const line of source.lines) {
      await tx.quotationLine.create({
        data: {
          versionId: version.id,
          sortOrder: line.sortOrder,
          description: line.description,
          details: line.details,
          quantity: line.quantity,
          unitPrice: revisedTotalByLineId.get(line.id) ?? line.total.mul(0),
          total: revisedTotalByLineId.get(line.id) ?? line.total.mul(0),
        },
      });
    }
    for (const cost of source.costSnapshots) {
      await tx.quotationCostSnapshot.create({
        data: {
          versionId: version.id,
          sourceCostItemId: cost.sourceCostItemId,
          category: cost.category,
          description: cost.description,
          originalCurrencyCode: cost.originalCurrencyCode,
          originalTotal: cost.originalTotal,
          exchangeRate: cost.exchangeRate,
          exchangeRateDate: cost.exchangeRateDate,
          convertedCurrencyCode: cost.convertedCurrencyCode,
          convertedTotal: cost.convertedTotal,
        },
      });
    }
    for (const rate of source.exchangeRateSnapshots) {
      await tx.quotationExchangeRateSnapshot.create({
        data: {
          versionId: version.id,
          sourceCurrencyCode: rate.sourceCurrencyCode,
          targetCurrencyCode: rate.targetCurrencyCode,
          rate: rate.rate,
          effectiveAt: rate.effectiveAt,
          purpose: rate.purpose,
        },
      });
    }
    await tx.quotation.update({
      where: { id: quotation.id },
      data: { currentVersionNumber: version.versionNumber, status: "GENERATED" },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "quotation.revised",
      entityType: "Quotation",
      entityId: quotation.id,
      next: {
        version: version.versionNumber,
        total: version.total.toString(),
        revisionReason: data.revisionReason,
        presentationMode: data.presentationMode,
      },
    });
  });
  revalidatePath(`/quotations/${data.quotationId}`);
}

async function changeQuotationStatus(
  quotationId: string,
  status: "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED",
  reason = "",
) {
  const actor = await requireCurrentUser();
  await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUniqueOrThrow({
      where: { id: quotationId },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    const version = quotation.versions[0];
    if (!version) throw new Error("Quotation version not found.");
    assertQuotationTransition(quotation.status, status);
    const expired = isQuotationExpired(version.validUntil);
    if (expired && status !== "EXPIRED") {
      throw new Error("An expired quotation cannot change state. Create a revision.");
    }
    if (!expired && status === "EXPIRED") {
      throw new Error("Quotation is still within its validity period.");
    }
    await tx.quotation.update({ where: { id: quotationId }, data: { status } });
    await tx.quotationVersion.update({
      where: { id: version.id },
      data: {
        status,
        sentAt: status === "SENT" ? new Date() : version.sentAt,
        acceptedAt: status === "ACCEPTED" ? new Date() : null,
        declinedAt: status === "DECLINED" ? new Date() : null,
        expiredAt: status === "EXPIRED" ? new Date() : null,
      },
    });
    if (status === "ACCEPTED") {
      await createBookingFromAcceptedQuotation(tx, {
        quotationId,
        quotationVersionId: version.id,
        actorId: actor.id,
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: `quotation.${status.toLowerCase()}`,
      entityType: "Quotation",
      entityId: quotationId,
      next: { version: version.versionNumber, status, reason: reason || undefined },
    });
  });
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/bookings");
}

export async function sendQuotationAction(formData: FormData) {
  await changeQuotationStatus(String(formData.get("quotationId") ?? ""), "SENT");
}
export async function acceptQuotationAction(formData: FormData) {
  await changeQuotationStatus(String(formData.get("quotationId") ?? ""), "ACCEPTED");
}
export async function declineQuotationAction(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Enter a decline reason.");
  await changeQuotationStatus(String(formData.get("quotationId") ?? ""), "DECLINED", reason);
}

export async function expireQuotationAction(formData: FormData) {
  await changeQuotationStatus(String(formData.get("quotationId") ?? ""), "EXPIRED");
}
