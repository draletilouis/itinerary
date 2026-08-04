"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calculateCostItem, calculateSellingPrice } from "@/modules/costing/services/pricing";
import { resolveExchangeRate } from "@/modules/costing/services/exchange-rates";
import { packageCosts, packageDays } from "@/modules/packages/templates";
import type { PackageDayTemplate } from "@/modules/packages/types";
import { nextReference } from "@/modules/settings/services/reference-number";
import { writeAuditEvent } from "@/server/audit/service";
import { requireCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

const tourTypes = [
  "CUSTOM",
  "STANDARD_PACKAGE",
  "GROUP_DEPARTURE",
  "PRIVATE",
  "CORPORATE",
  "SCHOOL",
  "DAY",
  "MULTI_DAY",
] as const;

const formSchema = z.object({
  mode: z.enum(["DIRECT", "ENQUIRY", "PACKAGE"]),
  enquiryId: z.string().optional().default(""),
  packageId: z.string().optional().default(""),
  packageVariant: z.enum(["BASE", "ALL_OPTIONS"]).optional().default("BASE"),
  customerId: z.string().optional().default(""),
  newCustomerName: z.string().trim().optional().default(""),
  newCustomerPhone: z.string().trim().optional().default(""),
  newCustomerEmail: z.string().trim().optional().default(""),
  name: z.string().trim().min(2),
  type: z.enum(tourTypes),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0),
  costingCurrencyCode: z.string().length(3),
  quotationCurrencyCode: z.string().length(3),
});

type PreparedCost = ReturnType<typeof packageCosts>[number] & {
  exchangeRate: Prisma.Decimal;
  result: ReturnType<typeof calculateCostItem>;
};

function asOptional(value: string) {
  return value || null;
}

export async function createTourFromWizardAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = formSchema.parse(Object.fromEntries(formData));
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (endDate < startDate) throw new Error("Tour end date cannot be before the start date.");
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

  const enquiry =
    data.mode === "ENQUIRY"
      ? await prisma.enquiry.findUniqueOrThrow({ where: { id: data.enquiryId } })
      : null;
  const packageEntry =
    data.mode === "PACKAGE"
      ? await prisma.tourPackage.findUniqueOrThrow({ where: { id: data.packageId } })
      : null;

  if (data.mode !== "ENQUIRY" && !data.customerId && (!data.newCustomerName || !data.newCustomerPhone)) {
    throw new Error("Select a customer or enter a new customer name and phone number.");
  }

  const templateDays = packageEntry ? packageDays(packageEntry.itineraryTemplate) : [];
  const allTemplateCosts = packageEntry ? packageCosts(packageEntry.costTemplate) : [];
  const templateCosts = allTemplateCosts.filter((cost) =>
    cost.classification === "INCLUDED" ||
    (cost.classification === "OPTIONAL" && data.packageVariant === "ALL_OPTIONS"),
  );
  const derivedInclusions = Array.from(new Set([
    ...(packageEntry?.inclusions ?? []),
    ...templateCosts.map((cost) => cost.inclusionText || cost.description),
  ]));
  const travellerCount = data.adults + data.children;
  const preparedCosts: PreparedCost[] = [];
  for (const cost of templateCosts) {
    const exchangeRate = await resolveExchangeRate(
      cost.originalCurrencyCode,
      data.costingCurrencyCode,
      startDate,
    );
    const eligibleTravellers =
      cost.basis.startsWith("PER_PERSON") && new Prisma.Decimal(cost.eligibleTravellers).isZero()
        ? String(travellerCount)
        : cost.eligibleTravellers;
    const result = calculateCostItem({
      ...cost,
      eligibleTravellers,
      exchangeRate,
    });
    preparedCosts.push({ ...cost, eligibleTravellers, exchangeRate, result });
  }

  const estimatedInternalCost = preparedCosts.reduce(
    (total, cost) => total.plus(cost.result.baseCurrencyTotal),
    new Prisma.Decimal(0),
  );
  const costingToQuotationRate =
    preparedCosts.length
      ? await resolveExchangeRate(
          data.costingCurrencyCode,
          data.quotationCurrencyCode,
          startDate,
        )
      : new Prisma.Decimal(1);
  const packagePricing =
    packageEntry && preparedCosts.length
      ? calculateSellingPrice({
          internalCost: estimatedInternalCost.mul(costingToQuotationRate),
          travellerCount,
          tourDays: duration,
          contingencyMethod: z
            .enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON", "PER_DAY"])
            .parse(packageEntry.defaultContingencyMethod),
          contingencyValue: packageEntry.defaultContingencyValue,
          markupMethod: z
            .enum(["PERCENTAGE", "FIXED", "PER_PERSON", "TARGET_PRICE", "TARGET_MARGIN"])
            .parse(packageEntry.defaultMarkupMethod),
          markupValue: packageEntry.defaultMarkupValue,
          taxMethod: z.enum(["NONE", "PERCENTAGE", "FIXED"]).parse(packageEntry.defaultTaxMethod),
          taxValue: packageEntry.defaultTaxValue,
          discountMethod: z
            .enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON"])
            .parse(packageEntry.defaultDiscountMethod),
          discountValue: packageEntry.defaultDiscountValue,
          minimumMargin: packageEntry.minimumMargin ?? 0,
        })
      : null;

  const tour = await prisma.$transaction(async (tx) => {
    let customerId = enquiry?.customerId ?? data.customerId;
    if (!customerId) {
      const customerReference = await nextReference(tx, "customer", "CUS");
      const customer = await tx.customer.create({
        data: {
          reference: customerReference,
          type: "INDIVIDUAL",
          fullName: data.newCustomerName,
          phone: data.newCustomerPhone,
          email: asOptional(data.newCustomerEmail.toLowerCase()),
          tags: [],
          createdById: actor.id,
        },
      });
      customerId = customer.id;
      await writeAuditEvent(tx, {
        actorId: actor.id,
        action: "customer.created-inline",
        entityType: "Customer",
        entityId: customer.id,
        next: { reference: customer.reference, fullName: customer.fullName },
      });
    }

    const reference = await nextReference(tx, "tour", "TOUR");
    const created = await tx.tour.create({
      data: {
        reference,
        name: data.name,
        customerId,
        sourceEnquiryId: enquiry?.id ?? null,
        sourcePackageId: packageEntry?.id ?? null,
        sourcePackageRevision: packageEntry?.revision ?? null,
        type: data.type,
        startDate,
        endDate,
        adults: data.adults,
        children: data.children,
        ownerId: actor.id,
        costingCurrencyCode: data.costingCurrencyCode,
        quotationCurrencyCode: data.quotationCurrencyCode,
        estimatedInternalCost,
        sellingPrice: packagePricing?.finalSellingPrice ?? 0,
        estimatedProfit: packagePricing?.estimatedProfit ?? 0,
        estimatedMargin: packagePricing?.estimatedMargin ?? 0,
        status: preparedCosts.length ? "COSTING" : "PLANNING",
      },
    });
    await tx.tourStatusHistory.create({
      data: {
        tourId: created.id,
        toStatus: created.status,
        reason:
          data.mode === "PACKAGE"
            ? `Created from ${packageEntry?.reference} revision ${packageEntry?.revision}`
            : data.mode === "ENQUIRY"
              ? `Created from ${enquiry?.reference}`
              : "Created directly",
        changedById: actor.id,
      },
    });

    const itineraryReference = await nextReference(tx, "itinerary", "ITI");
    const itinerary = await tx.itinerary.create({
      data: {
        reference: itineraryReference,
        title: packageEntry?.name ?? data.name,
        enquiryId: enquiry?.id ?? null,
        tourId: created.id,
        startDate,
        endDate,
        createdById: actor.id,
      },
    });
    const version = await tx.itineraryVersion.create({
      data: {
        itineraryId: itinerary.id,
        versionNumber: 1,
        title: packageEntry?.name ?? data.name,
        introduction: packageEntry?.introduction ?? null,
        summary: packageEntry?.summary ?? null,
        inclusions: packageEntry ? derivedInclusions : [],
        exclusions: packageEntry?.exclusions ?? [],
        importantNotes: packageEntry?.importantNotes ?? null,
        terms: packageEntry?.terms ?? null,
        changeNote: packageEntry
          ? `Copied from ${packageEntry.reference} revision ${packageEntry.revision}`
          : "Initial tour itinerary",
        createdById: actor.id,
      },
    });

    const dayIdByNumber = new Map<number, string>();
    const daysToCreate: PackageDayTemplate[] =
      templateDays.length > 0
        ? templateDays
        : Array.from({ length: duration }, (_, index) => ({
            dayNumber: index + 1,
            title: `Day ${index + 1}`,
            meals: [] as string[],
            items: [],
          }));
    for (const sourceDay of daysToCreate) {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + sourceDay.dayNumber - 1);
      const day = await tx.itineraryDay.create({
        data: {
          versionId: version.id,
          dayNumber: sourceDay.dayNumber,
          date,
          title: sourceDay.title,
          destinationId: sourceDay.destinationId ?? null,
          startLocation: sourceDay.startLocation ?? null,
          endLocation: sourceDay.endLocation ?? null,
          clientNarrative: sourceDay.clientNarrative ?? null,
          meals: sourceDay.meals,
          transport: sourceDay.transport ?? null,
        },
      });
      dayIdByNumber.set(sourceDay.dayNumber, day.id);
      for (const [index, item] of sourceDay.items.entries()) {
        await tx.itineraryItem.create({
          data: {
            dayId: day.id,
            sortOrder: index + 1,
            type: item.type,
            startTime: item.startTime ?? null,
            endTime: item.endTime ?? null,
            title: item.title,
            clientDescription: item.clientDescription ?? null,
            activityId: item.activityId ?? null,
            accommodationId: item.accommodationId ?? null,
            roomTypeId: item.roomTypeId ?? null,
            guestsPerRoom: item.guestsPerRoom ?? null,
            supplierId: item.supplierId ?? null,
          },
        });
      }
    }

    for (const cost of preparedCosts) {
      await tx.tourCostItem.create({
        data: {
          tourId: created.id,
          itineraryDayId: cost.dayNumber ? dayIdByNumber.get(cost.dayNumber) ?? null : null,
          supplierId: cost.supplierId ?? null,
          category: cost.category,
          description: cost.description,
          basis: cost.basis,
          unitCost: new Prisma.Decimal(cost.unitCost),
          quantity: new Prisma.Decimal(cost.quantity),
          days: new Prisma.Decimal(cost.days),
          nights: new Prisma.Decimal(cost.nights),
          rooms: new Prisma.Decimal(cost.rooms),
          vehicles: new Prisma.Decimal(cost.vehicles),
          eligibleTravellers: new Prisma.Decimal(cost.eligibleTravellers),
          taxPercentage: new Prisma.Decimal(cost.taxPercentage),
          commissionPercentage: new Prisma.Decimal(cost.commissionPercentage),
          overrideTotal: cost.overrideTotal ? new Prisma.Decimal(cost.overrideTotal) : null,
          overrideReason: cost.overrideReason ?? null,
          originalCurrencyCode: cost.originalCurrencyCode,
          originalTotal: cost.result.originalTotal,
          exchangeRate: cost.exchangeRate,
          exchangeRateDate: startDate,
          convertedCurrencyCode: data.costingCurrencyCode,
          convertedTotal: cost.result.baseCurrencyTotal,
          createdById: actor.id,
        },
      });
    }

    if (packagePricing && packageEntry) {
      await tx.tourPricing.create({
        data: {
          tourId: created.id,
          revision: 1,
          currencyCode: data.quotationCurrencyCode,
          internalCost: estimatedInternalCost.mul(costingToQuotationRate),
          costingToQuotationRate,
          contingency: packagePricing.contingency,
          costAfterContingency: packagePricing.costAfterContingency,
          markupMethod: packageEntry.defaultMarkupMethod,
          markupValue: packageEntry.defaultMarkupValue,
          markupAmount: packagePricing.markup,
          markupPercentage: packagePricing.markupPercentage,
          tax: packagePricing.tax,
          discount: packagePricing.discount,
          sellingPrice: packagePricing.finalSellingPrice,
          estimatedProfit: packagePricing.estimatedProfit,
          estimatedMargin: packagePricing.estimatedMargin,
          pricePerTraveller: packagePricing.pricePerTraveller,
          minimumMargin: packageEntry.minimumMargin,
          createdById: actor.id,
        },
      });
      if (packageEntry.minimumMargin) {
        await tx.tourMarginSetting.create({
          data: {
            tourId: created.id,
            minimumMargin: packageEntry.minimumMargin,
            changedById: actor.id,
          },
        });
      }
    }

    if (enquiry) {
      await tx.enquiry.update({ where: { id: enquiry.id }, data: { status: "PLANNING" } });
      await tx.enquiryStatusHistory.create({
        data: {
          enquiryId: enquiry.id,
          fromStatus: enquiry.status,
          toStatus: "PLANNING",
          reason: `Converted to ${reference}`,
          changedById: actor.id,
        },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action:
        data.mode === "PACKAGE"
          ? "tour.created-from-package"
          : data.mode === "ENQUIRY"
            ? "tour.created-from-enquiry"
            : "tour.created-directly",
      entityType: "Tour",
      entityId: created.id,
      next: {
        reference,
        customerId,
        sourcePackageId: packageEntry?.id,
        sourcePackageRevision: packageEntry?.revision,
        packageVariant: packageEntry ? data.packageVariant : undefined,
        sourceEnquiryId: enquiry?.id,
      },
    });
    return created;
  });

  redirect(`/tours/${tour.id}`);
}
