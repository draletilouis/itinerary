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

export async function generateQuotationAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z.object({
    tourId: z.string().uuid(),
    validUntil: z.string().min(1),
    customerNotes: z.string().trim().optional().default(""),
    terms: z.string().trim().optional().default(""),
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
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
    const pricing = tour.pricingSnapshots[0];
    if (!pricing) throw new Error("Save tour pricing before generating a quotation.");
    const itineraryVersion = tour.itineraries[0]?.versions[0];
    if (!itineraryVersion) {
      throw new Error("Publish an itinerary version before generating a quotation.");
    }
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
        internalCost: pricing.internalCost,
        estimatedProfit: pricing.estimatedProfit,
        estimatedMargin: pricing.estimatedMargin,
        customerNotes: data.customerNotes || null,
        terms: data.terms || itineraryVersion.terms,
        status: "GENERATED",
        createdById: actor.id,
      },
    });
    await tx.quotationLine.create({
      data: {
        versionId: version.id,
        sortOrder: 1,
        description: tour.name,
        details: `${tour.adults + tour.children} travellers · ${tour.startDate.toLocaleDateString("en-UG")} to ${tour.endDate.toLocaleDateString("en-UG")}`,
        quantity: 1,
        unitPrice: subtotal,
        total: subtotal,
      },
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
          unitPrice: line.sortOrder === 1 ? totals.subtotal : line.unitPrice,
          total: line.sortOrder === 1 ? totals.subtotal : line.total,
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
