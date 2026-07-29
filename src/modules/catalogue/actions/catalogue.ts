"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";

const optional = z.string().trim().optional().default("");
const decimal = optional.refine(
  (value) => !value || /^-?\d+(\.\d+)?$/.test(value),
  "Enter a valid number.",
);
const positiveMoney = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Enter a valid amount.");

export async function createDestinationAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      name: z.string().trim().min(2),
      country: z.string().trim().min(2),
      region: optional,
      shortDescription: optional,
      bestTravelPeriods: optional,
      typicalStayDays: z.union([z.literal(""), z.coerce.number().int().positive()]),
      latitude: decimal,
      longitude: decimal,
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const created = await tx.destination.create({
      data: {
        name: data.name,
        country: data.country,
        region: data.region || null,
        shortDescription: data.shortDescription || null,
        bestTravelPeriods: data.bestTravelPeriods || null,
        typicalStayDays:
          data.typicalStayDays === "" ? null : data.typicalStayDays,
        latitude: data.latitude ? new Prisma.Decimal(data.latitude) : null,
        longitude: data.longitude ? new Prisma.Decimal(data.longitude) : null,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "destination.created",
      entityType: "Destination",
      entityId: created.id,
      next: { name: created.name, country: created.country },
    });
  });
  revalidatePath("/settings/catalogue");
}

export async function createSupplierCategoryAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z.object({
    name: z.string().trim().min(2),
    description: optional,
  }).parse(Object.fromEntries(formData));

  const category = await prisma.supplierCategory.create({
    data: { name: data.name, description: data.description || null },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: actor.id,
      action: "supplier-category.created",
      entityType: "SupplierCategory",
      entityId: category.id,
      newValues: { name: category.name },
    },
  });
  revalidatePath("/suppliers");
}

export async function createSupplierAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      name: z.string().trim().min(2),
      categoryId: z.string().uuid(),
      contactPerson: optional,
      phone: optional,
      email: z.string().trim().email().or(z.literal("")),
      address: optional,
      paymentTerms: optional,
      preferredCurrencyCode: optional,
      contractStart: optional,
      contractEnd: optional,
      notes: optional,
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const reference = await nextReference(tx, "supplier", "SUP");
    const created = await tx.supplier.create({
      data: {
        reference,
        name: data.name,
        categoryId: data.categoryId,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        paymentTerms: data.paymentTerms || null,
        preferredCurrencyCode: data.preferredCurrencyCode || null,
        contractStart: data.contractStart ? new Date(data.contractStart) : null,
        contractEnd: data.contractEnd ? new Date(data.contractEnd) : null,
        notes: data.notes || null,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "supplier.created",
      entityType: "Supplier",
      entityId: created.id,
      next: { reference, name: created.name, categoryId: created.categoryId },
    });
  });
  revalidatePath("/suppliers");
  revalidatePath("/settings/catalogue");
}

export async function addSupplierRateAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z.object({
    supplierId: z.string().uuid(),
    service: z.string().trim().min(2),
    unit: z.string().trim().min(1),
    amount: positiveMoney,
    currencyCode: z.string().length(3),
    startDate: z.string().min(1),
    endDate: optional,
    notes: optional,
  }).parse(Object.fromEntries(formData));
  if (data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    throw new Error("Rate end date cannot be before its start date.");
  }

  const rate = await prisma.supplierRate.create({
    data: {
      supplierId: data.supplierId,
      service: data.service,
      unit: data.unit,
      amount: new Prisma.Decimal(data.amount),
      currencyCode: data.currencyCode,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes || null,
    },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: actor.id,
      action: "supplier-rate.created",
      entityType: "SupplierRate",
      entityId: rate.id,
      newValues: { supplierId: rate.supplierId, service: rate.service, amount: rate.amount.toString(), currency: rate.currencyCode },
    },
  });
  revalidatePath("/suppliers");
}

export async function createActivityAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      name: z.string().trim().min(2),
      destinationId: z.string().uuid(),
      category: z.string().trim().min(2),
      description: optional,
      durationMinutes: z.union([z.literal(""), z.coerce.number().int().positive()]),
      supplierId: optional,
      capacity: z.union([z.literal(""), z.coerce.number().int().positive()]),
      permitRequirements: optional,
      safetyNotes: optional,
    })
    .parse(Object.fromEntries(formData));

  const created = await prisma.activity.create({
    data: {
      name: data.name,
      destinationId: data.destinationId,
      category: data.category,
      description: data.description || null,
      durationMinutes: data.durationMinutes === "" ? null : data.durationMinutes,
      supplierId: data.supplierId || null,
      capacity: data.capacity === "" ? null : data.capacity,
      permitRequirements: data.permitRequirements || null,
      safetyNotes: data.safetyNotes || null,
      availableStartTimes: [],
    },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: actor.id,
      action: "activity.created",
      entityType: "Activity",
      entityId: created.id,
      newValues: { name: created.name, destinationId: created.destinationId },
    },
  });
  revalidatePath("/settings/catalogue");
}

export async function addActivityRateAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      activityId: z.string().uuid(),
      rateType: z.string().trim().min(2),
      amount: positiveMoney,
      currencyCode: z.string().length(3),
      startDate: z.string().min(1),
      endDate: optional,
      supplierId: optional,
    })
    .parse(Object.fromEntries(formData));

  const rate = await prisma.activityRate.create({
    data: {
      activityId: data.activityId,
      rateType: data.rateType,
      amount: new Prisma.Decimal(data.amount),
      currencyCode: data.currencyCode,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      supplierId: data.supplierId || null,
    },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: actor.id,
      action: "activity-rate.created",
      entityType: "ActivityRate",
      entityId: rate.id,
      newValues: {
        activityId: rate.activityId,
        amount: rate.amount.toString(),
        currency: rate.currencyCode,
        startDate: rate.startDate.toISOString(),
      },
    },
  });
  revalidatePath("/settings/catalogue");
}

export async function createAccommodationAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      name: z.string().trim().min(2),
      destinationId: z.string().uuid(),
      type: z.string().trim().min(2),
      rating: optional,
      description: optional,
      contactInfo: optional,
      checkInTime: optional,
      checkOutTime: optional,
      amenities: optional,
      mealPlans: optional,
      supplierId: optional,
    })
    .parse(Object.fromEntries(formData));

  const created = await prisma.accommodation.create({
    data: {
      name: data.name,
      destinationId: data.destinationId,
      type: data.type,
      rating: data.rating || null,
      description: data.description || null,
      contactInfo: data.contactInfo || null,
      checkInTime: data.checkInTime || null,
      checkOutTime: data.checkOutTime || null,
      amenities: data.amenities.split(",").map((item) => item.trim()).filter(Boolean),
      mealPlans: data.mealPlans.split(",").map((item) => item.trim()).filter(Boolean),
      supplierId: data.supplierId || null,
    },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: actor.id,
      action: "accommodation.created",
      entityType: "Accommodation",
      entityId: created.id,
      newValues: { name: created.name, destinationId: created.destinationId },
    },
  });
  revalidatePath("/settings/catalogue");
}

export async function addRoomTypeAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      accommodationId: z.string().uuid(),
      name: z.string().trim().min(2),
      maximumOccupancy: z.coerce.number().int().positive(),
      adultCapacity: z.coerce.number().int().positive(),
      childCapacity: z.coerce.number().int().nonnegative(),
      bedConfiguration: optional,
      description: optional,
    })
    .parse(Object.fromEntries(formData));

  const room = await prisma.roomType.create({
    data: {
      accommodationId: data.accommodationId,
      name: data.name,
      maximumOccupancy: data.maximumOccupancy,
      adultCapacity: data.adultCapacity,
      childCapacity: data.childCapacity,
      bedConfiguration: data.bedConfiguration || null,
      description: data.description || null,
    },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: actor.id,
      action: "room-type.created",
      entityType: "RoomType",
      entityId: room.id,
      newValues: { accommodationId: room.accommodationId, name: room.name },
    },
  });
  revalidatePath("/settings/catalogue");
}

export async function addAccommodationRateAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      accommodationId: z.string().uuid(),
      roomTypeId: z.string().uuid(),
      mealPlan: z.string().trim().min(1),
      occupancyGuests: z.coerce.number().int().positive(),
      amount: positiveMoney,
      currencyCode: z.string().length(3),
      startDate: z.string().min(1),
      endDate: optional,
      supplierId: optional,
      contractReference: optional,
      taxIncluded: z.string().optional().transform((value) => value === "on"),
    })
    .parse(Object.fromEntries(formData));

  const roomType = await prisma.roomType.findFirst({
    where: { id: data.roomTypeId, accommodationId: data.accommodationId, status: "ACTIVE" },
    include: { accommodation: { select: { supplierId: true } } },
  });
  if (!roomType) throw new Error("The room type does not belong to the selected accommodation.");
  if (data.occupancyGuests > roomType.maximumOccupancy) {
    throw new Error(`Occupancy cannot exceed the room maximum of ${roomType.maximumOccupancy}.`);
  }
  const rate = await prisma.accommodationRate.create({
    data: {
      accommodationId: data.accommodationId,
      roomTypeId: data.roomTypeId,
      mealPlan: data.mealPlan,
      occupancy: `${data.occupancyGuests} guest${data.occupancyGuests === 1 ? "" : "s"}`,
      occupancyGuests: data.occupancyGuests,
      amount: new Prisma.Decimal(data.amount),
      currencyCode: data.currencyCode,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      supplierId: roomType.accommodation.supplierId,
      contractReference: data.contractReference || null,
      taxIncluded: data.taxIncluded,
    },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: actor.id,
      action: "accommodation-rate.created",
      entityType: "AccommodationRate",
      entityId: rate.id,
      newValues: {
        accommodationId: rate.accommodationId,
        amount: rate.amount.toString(),
        currency: rate.currencyCode,
      },
    },
  });
  revalidatePath("/settings/catalogue");
}
