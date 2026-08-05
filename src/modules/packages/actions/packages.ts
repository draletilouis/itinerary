"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { nextReference } from "@/modules/settings/services/reference-number";
import { writeAuditEvent } from "@/server/audit/service";
import { requireCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { packageCosts, packageDays } from "../templates";

const number = z.string().trim().regex(/^\d+(\.\d+)?$/);
const optionalNumber = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => !value || /^\d+(\.\d+)?$/.test(value));
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
const json = (value: unknown) => value as Prisma.InputJsonValue;

const packageTypes = [
  "CUSTOM",
  "STANDARD_PACKAGE",
  "GROUP_DEPARTURE",
  "PRIVATE",
  "CORPORATE",
  "SCHOOL",
  "DAY",
  "MULTI_DAY",
] as const;

export async function createTourPackageAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      name: z.string().trim().min(2),
      description: z.string().trim().optional().default(""),
      type: z.enum(packageTypes).optional().default("STANDARD_PACKAGE"),
      durationDays: z.coerce.number().int().min(1).max(60),
      defaultAdults: z.coerce.number().int().min(1),
      defaultChildren: z.coerce.number().int().min(0).optional().default(0),
      costingCurrencyCode: z.string().length(3),
      quotationCurrencyCode: z.string().length(3).optional(),
      defaultMarkupMethod: z
        .enum(["PERCENTAGE", "FIXED", "PER_PERSON", "TARGET_PRICE", "TARGET_MARGIN"])
        .optional()
        .default("PERCENTAGE"),
      defaultMarkupValue: number.optional().default("20"),
    })
    .parse(Object.fromEntries(formData));

  const created = await prisma.$transaction(async (tx) => {
    const reference = await nextReference(tx, "package", "PKG");
    const days = Array.from({ length: data.durationDays }, (_, index) => ({
      dayNumber: index + 1,
      title: `Day ${index + 1}`,
      meals: [] as string[],
      items: [],
    }));
    const entry = await tx.tourPackage.create({
      data: {
        reference,
        name: data.name,
        description: data.description || null,
        type: data.type,
        durationDays: data.durationDays,
        defaultAdults: data.defaultAdults,
        defaultChildren: data.defaultChildren,
        costingCurrencyCode: data.costingCurrencyCode,
        quotationCurrencyCode:
          data.quotationCurrencyCode ?? data.costingCurrencyCode,
        inclusions: [],
        exclusions: [],
        itineraryTemplate: json(days),
        costTemplate: json([]),
        defaultMarkupMethod: data.defaultMarkupMethod,
        defaultMarkupValue: new Prisma.Decimal(data.defaultMarkupValue),
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-package.created",
      entityType: "TourPackage",
      entityId: entry.id,
      next: { reference, name: entry.name, durationDays: entry.durationDays },
    });
    return entry;
  });
  redirect(`/packages/${created.id}`);
}

export async function updateTourPackageAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      packageId: z.string().uuid(),
      name: z.string().trim().min(2),
      description: z.string().trim().optional().default(""),
      type: z.enum(packageTypes),
      durationDays: z.coerce.number().int().min(1).max(60),
      defaultAdults: z.coerce.number().int().min(1),
      defaultChildren: z.coerce.number().int().min(0),
      costingCurrencyCode: z.string().length(3),
      quotationCurrencyCode: z.string().length(3),
      introduction: z.string().trim().optional().default(""),
      summary: z.string().trim().optional().default(""),
      inclusions: z.string().optional().default(""),
      exclusions: z.string().optional().default(""),
      importantNotes: z.string().trim().optional().default(""),
      terms: z.string().trim().optional().default(""),
      defaultContingencyMethod: z.enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON", "PER_DAY"]),
      defaultContingencyValue: optionalNumber,
      defaultMarkupMethod: z.enum([
        "PERCENTAGE",
        "FIXED",
        "PER_PERSON",
        "TARGET_PRICE",
        "TARGET_MARGIN",
      ]),
      defaultMarkupValue: number,
      defaultTaxMethod: z.enum(["NONE", "PERCENTAGE", "FIXED"]),
      defaultTaxValue: optionalNumber,
      defaultDiscountMethod: z.enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON"]),
      defaultDiscountValue: optionalNumber,
      minimumMargin: optionalNumber,
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const previous = await tx.tourPackage.findUniqueOrThrow({ where: { id: data.packageId } });
    const existingDays = packageDays(previous.itineraryTemplate);
    const adjustedDays = Array.from({ length: data.durationDays }, (_, index) => {
      const existing = existingDays[index];
      return (
        existing ?? {
          dayNumber: index + 1,
          title: `Day ${index + 1}`,
          meals: [],
          items: [],
        }
      );
    }).map((day, index) => ({ ...day, dayNumber: index + 1 }));

    const updated = await tx.tourPackage.update({
      where: { id: data.packageId },
      data: {
        name: data.name,
        description: data.description || null,
        type: data.type,
        durationDays: data.durationDays,
        defaultAdults: data.defaultAdults,
        defaultChildren: data.defaultChildren,
        costingCurrencyCode: data.costingCurrencyCode,
        quotationCurrencyCode: data.quotationCurrencyCode,
        introduction: data.introduction || null,
        summary: data.summary || null,
        inclusions: lines(data.inclusions),
        exclusions: lines(data.exclusions),
        importantNotes: data.importantNotes || null,
        terms: data.terms || null,
        itineraryTemplate: json(adjustedDays),
        defaultContingencyMethod: data.defaultContingencyMethod,
        defaultContingencyValue: new Prisma.Decimal(data.defaultContingencyValue || 0),
        defaultMarkupMethod: data.defaultMarkupMethod,
        defaultMarkupValue: new Prisma.Decimal(data.defaultMarkupValue),
        defaultTaxMethod: data.defaultTaxMethod,
        defaultTaxValue: new Prisma.Decimal(data.defaultTaxValue || 0),
        defaultDiscountMethod: data.defaultDiscountMethod,
        defaultDiscountValue: new Prisma.Decimal(data.defaultDiscountValue || 0),
        minimumMargin: data.minimumMargin ? new Prisma.Decimal(data.minimumMargin) : null,
        revision: { increment: 1 },
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-package.updated",
      entityType: "TourPackage",
      entityId: updated.id,
      previous: { revision: previous.revision },
      next: { revision: updated.revision, name: updated.name },
    });
  });
  revalidatePath(`/packages/${data.packageId}`);
  revalidatePath("/packages");
}


export async function updateTourPackageBasicsAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      packageId: z.string().uuid(),
      name: z.string().trim().min(2),
      description: z.string().trim().optional().default(""),
      type: z.enum(packageTypes),
      durationDays: z.coerce.number().int().min(1).max(60),
      defaultAdults: z.coerce.number().int().min(1),
      defaultChildren: z.coerce.number().int().min(0),
      costingCurrencyCode: z.string().length(3),
      quotationCurrencyCode: z.string().length(3),
      introduction: z.string().trim().optional().default(""),
      summary: z.string().trim().optional().default(""),
      inclusions: z.string().optional().default(""),
      exclusions: z.string().optional().default(""),
      importantNotes: z.string().trim().optional().default(""),
      terms: z.string().trim().optional().default(""),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const previous = await tx.tourPackage.findUniqueOrThrow({
      where: { id: data.packageId },
    });
    const existingDays = packageDays(previous.itineraryTemplate);
    const adjustedDays = Array.from({ length: data.durationDays }, (_, index) => {
      const existing = existingDays[index];
      return (
        existing ?? {
          dayNumber: index + 1,
          title: `Day ${index + 1}`,
          meals: [],
          items: [],
        }
      );
    }).map((day, index) => ({ ...day, dayNumber: index + 1 }));

    const updated = await tx.tourPackage.update({
      where: { id: data.packageId },
      data: {
        name: data.name,
        description: data.description || null,
        type: data.type,
        durationDays: data.durationDays,
        defaultAdults: data.defaultAdults,
        defaultChildren: data.defaultChildren,
        costingCurrencyCode: data.costingCurrencyCode,
        quotationCurrencyCode: data.quotationCurrencyCode,
        introduction: data.introduction || null,
        summary: data.summary || null,
        inclusions: lines(data.inclusions),
        exclusions: lines(data.exclusions),
        importantNotes: data.importantNotes || null,
        terms: data.terms || null,
        itineraryTemplate: json(adjustedDays),
        revision: { increment: 1 },
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-package.details-updated",
      entityType: "TourPackage",
      entityId: updated.id,
      previous: { revision: previous.revision, durationDays: previous.durationDays },
      next: { revision: updated.revision, durationDays: updated.durationDays },
    });
  });
  revalidatePath(`/packages/${data.packageId}`);
  revalidatePath("/packages");
}

export async function updateTourPackagePricingAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      packageId: z.string().uuid(),
      defaultContingencyMethod: z.enum([
        "NONE",
        "PERCENTAGE",
        "FIXED",
        "PER_PERSON",
        "PER_DAY",
      ]),
      defaultContingencyValue: optionalNumber,
      defaultMarkupMethod: z.enum([
        "PERCENTAGE",
        "FIXED",
        "PER_PERSON",
        "TARGET_PRICE",
        "TARGET_MARGIN",
      ]),
      defaultMarkupValue: number,
      defaultTaxMethod: z.enum(["NONE", "PERCENTAGE", "FIXED"]),
      defaultTaxValue: optionalNumber,
      defaultDiscountMethod: z.enum(["NONE", "PERCENTAGE", "FIXED", "PER_PERSON"]),
      defaultDiscountValue: optionalNumber,
      minimumMargin: optionalNumber,
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const previous = await tx.tourPackage.findUniqueOrThrow({
      where: { id: data.packageId },
    });
    const updated = await tx.tourPackage.update({
      where: { id: data.packageId },
      data: {
        defaultContingencyMethod: data.defaultContingencyMethod,
        defaultContingencyValue: new Prisma.Decimal(data.defaultContingencyValue || 0),
        defaultMarkupMethod: data.defaultMarkupMethod,
        defaultMarkupValue: new Prisma.Decimal(data.defaultMarkupValue),
        defaultTaxMethod: data.defaultTaxMethod,
        defaultTaxValue: new Prisma.Decimal(data.defaultTaxValue || 0),
        defaultDiscountMethod: data.defaultDiscountMethod,
        defaultDiscountValue: new Prisma.Decimal(data.defaultDiscountValue || 0),
        minimumMargin: data.minimumMargin
          ? new Prisma.Decimal(data.minimumMargin)
          : null,
        revision: { increment: 1 },
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-package.pricing-updated",
      entityType: "TourPackage",
      entityId: updated.id,
      previous: { revision: previous.revision },
      next: {
        revision: updated.revision,
        markupMethod: updated.defaultMarkupMethod,
        markupValue: updated.defaultMarkupValue,
      },
    });
  });
  revalidatePath(`/packages/${data.packageId}`);
  revalidatePath("/packages");
}

export async function updatePackageDayAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      packageId: z.string().uuid(),
      dayNumber: z.coerce.number().int().positive(),
      title: z.string().trim().min(2),
      destinationId: z.string().optional().default(""),
      startLocation: z.string().trim().optional().default(""),
      endLocation: z.string().trim().optional().default(""),
      clientNarrative: z.string().trim().optional().default(""),
      meals: z.string().optional().default(""),
      transport: z.string().trim().optional().default(""),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const entry = await tx.tourPackage.findUniqueOrThrow({ where: { id: data.packageId } });
    const days = packageDays(entry.itineraryTemplate);
    const index = days.findIndex((day) => day.dayNumber === data.dayNumber);
    if (index < 0) throw new Error("Package day not found.");
    days[index] = {
      ...days[index],
      title: data.title,
      destinationId: data.destinationId || undefined,
      startLocation: data.startLocation || undefined,
      endLocation: data.endLocation || undefined,
      clientNarrative: data.clientNarrative || undefined,
      meals: data.meals.split(",").map((item) => item.trim()).filter(Boolean),
      transport: data.transport || undefined,
    };
    await tx.tourPackage.update({
      where: { id: entry.id },
      data: { itineraryTemplate: json(days), revision: { increment: 1 } },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-package.day-updated",
      entityType: "TourPackage",
      entityId: entry.id,
      next: { dayNumber: data.dayNumber, title: data.title },
    });
  });
  revalidatePath(`/packages/${data.packageId}`);
}

export async function addPackageItemAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      packageId: z.string().uuid(),
      dayNumber: z.coerce.number().int().positive(),
      type: z.enum(["ACTIVITY", "ACCOMMODATION", "TRANSPORT", "MEAL", "NOTE", "OTHER"]),
      title: z.string().trim().min(2),
      startTime: z.string().optional().default(""),
      endTime: z.string().optional().default(""),
      clientDescription: z.string().trim().optional().default(""),
      activityId: z.string().optional().default(""),
      accommodationId: z.string().optional().default(""),
      roomTypeId: z.string().optional().default(""),
      guestsPerRoom: z.coerce.number().int().positive().optional(),
      supplierId: z.string().optional().default(""),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const entry = await tx.tourPackage.findUniqueOrThrow({ where: { id: data.packageId } });
    const days = packageDays(entry.itineraryTemplate);
    const day = days.find((item) => item.dayNumber === data.dayNumber);
    if (!day) throw new Error("Package day not found.");
    if (data.type === "ACCOMMODATION") {
      if (!data.accommodationId || !data.roomTypeId || !data.guestsPerRoom) {
        throw new Error("Accommodation items require a property, room type and people per room.");
      }
      const roomType = await tx.roomType.findFirst({
        where: { id: data.roomTypeId, accommodationId: data.accommodationId, status: "ACTIVE" },
        select: { maximumOccupancy: true },
      });
      if (!roomType || data.guestsPerRoom > roomType.maximumOccupancy) {
        throw new Error("The selected room occupancy is invalid.");
      }
    }
    day.items.push({
      type: data.type,
      title: data.title,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      clientDescription: data.clientDescription || undefined,
      activityId: data.activityId || undefined,
      accommodationId: data.accommodationId || undefined,
      roomTypeId: data.roomTypeId || undefined,
      guestsPerRoom: data.guestsPerRoom,
      supplierId: data.supplierId || undefined,
    });
    await tx.tourPackage.update({
      where: { id: entry.id },
      data: { itineraryTemplate: json(days), revision: { increment: 1 } },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-package.item-added",
      entityType: "TourPackage",
      entityId: entry.id,
      next: { dayNumber: data.dayNumber, type: data.type, title: data.title },
    });
  });
  revalidatePath(`/packages/${data.packageId}`);
}

export async function addPackageCostAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      packageId: z.string().uuid(),
      category: z.string().trim().min(2),
      description: z.string().trim().min(2),
      basis: z.enum(["STANDARD", "ACCOMMODATION", "PER_PERSON", "PER_PERSON_PER_NIGHT", "PER_PERSON_PER_DAY", "VEHICLE", "OVERRIDE"]),
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
      supplierId: z.string().optional().default(""),
      dayNumber: z.string().optional().default(""),
      classification: z.enum(["INCLUDED", "OPTIONAL", "EXCLUDED"]),
      optionCode: z.string().trim().optional().default(""),
      inclusionText: z.string().trim().optional().default(""),
      supplierRateId: z.string().optional().default(""),
      useTravellerRateBands: z.string().optional().default(""),
      rate_UGANDAN_ADULT: z.string().optional().default(""), currency_UGANDAN_ADULT: z.string().optional().default("USD"),
      rate_UGANDAN_CHILD: z.string().optional().default(""), currency_UGANDAN_CHILD: z.string().optional().default("USD"),
      rate_EAST_AFRICAN_ADULT: z.string().optional().default(""), currency_EAST_AFRICAN_ADULT: z.string().optional().default("USD"),
      rate_EAST_AFRICAN_CHILD: z.string().optional().default(""), currency_EAST_AFRICAN_CHILD: z.string().optional().default("USD"),
      rate_NON_EAST_AFRICAN_ADULT: z.string().optional().default(""), currency_NON_EAST_AFRICAN_ADULT: z.string().optional().default("USD"),
      rate_NON_EAST_AFRICAN_CHILD: z.string().optional().default(""), currency_NON_EAST_AFRICAN_CHILD: z.string().optional().default("USD"),
    })
    .parse(Object.fromEntries(formData));
  if (data.basis === "OVERRIDE" && (!data.overrideTotal || !data.overrideReason)) {
    throw new Error("Override costs require a total and reason.");
  }

  await prisma.$transaction(async (tx) => {
    const rateFields = data as unknown as Record<string, string>;
    const travellerRateBands = data.useTravellerRateBands === "true"
      ? (["UGANDAN", "EAST_AFRICAN", "NON_EAST_AFRICAN"] as const).flatMap((pricingCategory) => (["ADULT", "CHILD"] as const).flatMap((ageBand) => {
          const amount = rateFields["rate_" + pricingCategory + "_" + ageBand];
          return amount && Number(amount) >= 0 ? [{ pricingCategory, ageBand, unitCost: amount, currencyCode: rateFields["currency_" + pricingCategory + "_" + ageBand] }] : [];
        }))
      : undefined;
    if (data.useTravellerRateBands === "true" && !travellerRateBands?.length) throw new Error("Enter at least one traveller-category rate.");
    const entry = await tx.tourPackage.findUniqueOrThrow({ where: { id: data.packageId } });
    const supplierRate = data.supplierRateId
      ? await tx.supplierRate.findFirstOrThrow({ where: { id: data.supplierRateId, status: "ACTIVE", startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] } })
      : null;
    const costs = packageCosts(entry.costTemplate);
    const durationNights = Math.max(entry.durationDays - 1, 0);
    const quantity = data.quantity || "1";
    const days = data.days || String(entry.durationDays);
    const nights = data.nights || String(durationNights);
    const rooms = data.rooms || "1";
    const vehicles = data.vehicles || "1";
    const eligibleTravellers =
      data.eligibleTravellers ||
      String(entry.defaultAdults + entry.defaultChildren);
    const requirePositive = (label: string, value: string) => {
      if (Number(value) <= 0) throw new Error(`${label} must be greater than zero.`);
    };
    if (data.basis === "STANDARD") {
      requirePositive("Quantity", quantity);
      requirePositive("Days", days);
    }
    if (data.basis === "ACCOMMODATION") {
      requirePositive("Rooms", rooms);
      requirePositive("Nights", nights);
    }
    if (data.basis.startsWith("PER_PERSON") && !travellerRateBands?.length) {
      requirePositive("People charged", eligibleTravellers);
    }
    if (data.basis === "PER_PERSON_PER_NIGHT") requirePositive("Nights", nights);
    if (data.basis === "PER_PERSON_PER_DAY") requirePositive("Days", days);
    if (data.basis === "VEHICLE") {
      requirePositive("Vehicles", vehicles);
      requirePositive("Days", days);
    }
    costs.push({
      category: data.category,
      description: data.description,
      basis: data.basis,
      unitCost: supplierRate?.amount.toString() ?? data.unitCost,
      quantity,
      days,
      nights,
      rooms,
      vehicles,
      eligibleTravellers,
      taxPercentage: data.taxPercentage || "0",
      commissionPercentage: data.commissionPercentage || "0",
      overrideTotal: data.overrideTotal || undefined,
      overrideReason: data.overrideReason || undefined,
      originalCurrencyCode: supplierRate?.currencyCode ?? data.originalCurrencyCode,
      supplierId: supplierRate?.supplierId ?? (data.supplierId || undefined),
      dayNumber: data.dayNumber ? Number(data.dayNumber) : undefined,
      classification: data.classification,
      optionCode: data.classification === "OPTIONAL" ? data.optionCode || "OPTIONAL_EXTRAS" : undefined,
      inclusionText: data.inclusionText || data.description,
      supplierRateId: supplierRate?.id,
      travellerRateBands,
    });
    await tx.tourPackage.update({
      where: { id: entry.id },
      data: { costTemplate: json(costs), revision: { increment: 1 } },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-package.cost-added",
      entityType: "TourPackage",
      entityId: entry.id,
      next: { category: data.category, description: data.description, classification: data.classification, supplierRateId: supplierRate?.id },
    });
  });
  revalidatePath(`/packages/${data.packageId}`);
}

export async function removePackageCostAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      packageId: z.string().uuid(),
      costIndex: z.coerce.number().int().min(0),
    })
    .parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const entry = await tx.tourPackage.findUniqueOrThrow({ where: { id: data.packageId } });
    const costs = packageCosts(entry.costTemplate);
    const [removed] = costs.splice(data.costIndex, 1);
    if (!removed) throw new Error("Package cost not found.");
    await tx.tourPackage.update({
      where: { id: entry.id },
      data: { costTemplate: json(costs), revision: { increment: 1 } },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour-package.cost-removed",
      entityType: "TourPackage",
      entityId: entry.id,
      previous: { description: removed.description },
    });
  });
  revalidatePath(`/packages/${data.packageId}`);
}
