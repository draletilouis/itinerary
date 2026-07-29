"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";

async function requireDraftVersion(tx: Prisma.TransactionClient, versionId: string) {
  const version = await tx.itineraryVersion.findUniqueOrThrow({
    where: { id: versionId },
  });
  if (version.status !== "DRAFT") {
    throw new Error("Published or reviewed itinerary versions cannot be edited. Create a new version.");
  }
  return version;
}

export async function createItineraryAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      title: z.string().trim().min(2),
      tourId: z.string().uuid(),
      introduction: z.string().trim().optional().default(""),
    })
    .parse(Object.fromEntries(formData));

  const itinerary = await prisma.$transaction(async (tx) => {
    const tour = await tx.tour.findUniqueOrThrow({
      where: { id: data.tourId },
      include: { itineraries: { where: { archivedAt: null }, select: { id: true }, take: 1 } },
    });
    if (tour.itineraries.length) {
      throw new Error("This tour already has an itinerary. Create a new itinerary version instead.");
    }
    const reference = await nextReference(tx, "itinerary", "ITI");
    const created = await tx.itinerary.create({
      data: {
        reference,
        title: data.title,
        tourId: tour.id,
        enquiryId: tour.sourceEnquiryId,
        startDate: tour.startDate,
        endDate: tour.endDate,
        createdById: actor.id,
      },
    });
    const version = await tx.itineraryVersion.create({
      data: {
        itineraryId: created.id,
        versionNumber: 1,
        title: data.title,
        introduction: data.introduction || null,
        inclusions: [],
        exclusions: [],
        createdById: actor.id,
      },
    });
    const duration =
      Math.round((tour.endDate.getTime() - tour.startDate.getTime()) / 86_400_000) + 1;
    for (let dayNumber = 1; dayNumber <= duration; dayNumber += 1) {
      const date = new Date(tour.startDate);
      date.setUTCDate(date.getUTCDate() + dayNumber - 1);
      await tx.itineraryDay.create({
        data: {
          versionId: version.id,
          dayNumber,
          date,
          title: `Day ${dayNumber}`,
          meals: [],
        },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "itinerary.created",
      entityType: "Itinerary",
      entityId: created.id,
      next: { reference, tourId: tour.id, version: 1 },
    });
    return created;
  });
  redirect(`/itineraries/${itinerary.id}`);
}

export async function updateItineraryVersionAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      itineraryId: z.string().uuid(),
      versionId: z.string().uuid(),
      title: z.string().trim().min(2),
      introduction: z.string().trim().optional().default(""),
      summary: z.string().trim().optional().default(""),
      inclusions: z.string().optional().default(""),
      exclusions: z.string().optional().default(""),
      importantNotes: z.string().trim().optional().default(""),
      terms: z.string().trim().optional().default(""),
    })
    .parse(Object.fromEntries(formData));
  const lines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await requireDraftVersion(tx, data.versionId);
    await tx.itineraryVersion.update({
      where: { id: data.versionId },
      data: {
        title: data.title,
        introduction: data.introduction || null,
        summary: data.summary || null,
        inclusions: lines(data.inclusions),
        exclusions: lines(data.exclusions),
        importantNotes: data.importantNotes || null,
        terms: data.terms || null,
      },
    });
    await tx.itinerary.update({
      where: { id: data.itineraryId },
      data: { title: data.title, updatedAt: new Date() },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "itinerary.version-updated",
      entityType: "ItineraryVersion",
      entityId: data.versionId,
      next: { title: data.title },
    });
  });
  revalidatePath(`/itineraries/${data.itineraryId}`);
}

export async function updateItineraryDayAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      itineraryId: z.string().uuid(),
      versionId: z.string().uuid(),
      dayId: z.string().uuid(),
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
    await requireDraftVersion(tx, data.versionId);
    await tx.itineraryDay.update({
      where: { id: data.dayId },
      data: {
        title: data.title,
        destinationId: data.destinationId || null,
        startLocation: data.startLocation || null,
        endLocation: data.endLocation || null,
        clientNarrative: data.clientNarrative || null,
        meals: data.meals.split(",").map((item) => item.trim()).filter(Boolean),
        transport: data.transport || null,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "itinerary.day-updated",
      entityType: "ItineraryDay",
      entityId: data.dayId,
      next: { title: data.title },
    });
  });
  revalidatePath(`/itineraries/${data.itineraryId}`);
}

export async function addItineraryItemAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      itineraryId: z.string().uuid(),
      versionId: z.string().uuid(),
      dayId: z.string().uuid(),
      type: z.enum(["ACTIVITY", "ACCOMMODATION", "TRANSPORT", "MEAL", "NOTE", "OTHER"]),
      startTime: z.string().optional().default(""),
      endTime: z.string().optional().default(""),
      title: z.string().trim().optional().default(""),
      clientDescription: z.string().trim().optional().default(""),
      activityId: z.string().uuid().optional(),
      accommodationId: z.string().uuid().optional(),
      roomTypeId: z.string().uuid().optional(),
      guestsPerRoom: z.coerce.number().int().positive().optional(),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    await requireDraftVersion(tx, data.versionId);
    const day = await tx.itineraryDay.findUniqueOrThrow({
      where: { id: data.dayId },
      select: { versionId: true, destinationId: true },
    });
    if (day.versionId !== data.versionId) {
      throw new Error("The selected itinerary day does not belong to this version.");
    }

    let title = data.title;
    let activityId: string | null = null;
    let accommodationId: string | null = null;
    let roomTypeId: string | null = null;
    let guestsPerRoom: number | null = null;
    let supplierId: string | null = null;

    if (data.type === "ACTIVITY") {
      if (!data.activityId) throw new Error("Select an activity.");
      if (!day.destinationId) {
        throw new Error("Set the day destination before selecting an activity.");
      }
      const activity = await tx.activity.findFirst({
        where: { id: data.activityId, status: "ACTIVE" },
        select: { id: true, name: true, destinationId: true, supplierId: true },
      });
      if (!activity || activity.destinationId !== day.destinationId) {
        throw new Error("The activity must belong to this day’s destination.");
      }
      title = activity.name;
      activityId = activity.id;
      supplierId = activity.supplierId;
    } else if (data.type === "ACCOMMODATION") {
      if (!data.accommodationId) throw new Error("Select accommodation.");
      if (!day.destinationId) {
        throw new Error("Set the day destination before selecting accommodation.");
      }
      const accommodation = await tx.accommodation.findFirst({
        where: { id: data.accommodationId, status: "ACTIVE" },
        select: { id: true, name: true, destinationId: true, supplierId: true },
      });
      if (!accommodation || accommodation.destinationId !== day.destinationId) {
        throw new Error("The accommodation must belong to this day’s destination.");
      }
      title = accommodation.name;
      if (!data.roomTypeId || !data.guestsPerRoom) {
        throw new Error("Select a room type and people per room.");
      }
      const roomType = await tx.roomType.findFirst({
        where: { id: data.roomTypeId, accommodationId: accommodation.id, status: "ACTIVE" },
        select: { id: true, maximumOccupancy: true },
      });
      if (!roomType || data.guestsPerRoom > roomType.maximumOccupancy) {
        throw new Error("The selected room occupancy is not valid for this accommodation.");
      }
      accommodationId = accommodation.id;
      roomTypeId = roomType.id;
      guestsPerRoom = data.guestsPerRoom;
      supplierId = accommodation.supplierId;
    } else if (data.activityId || data.accommodationId) {
      throw new Error("Catalogue links are not valid for this item type.");
    }

    if (title.trim().length < 2) throw new Error("Enter an item title.");
    const last = await tx.itineraryItem.aggregate({
      where: { dayId: data.dayId },
      _max: { sortOrder: true },
    });
    const item = await tx.itineraryItem.create({
      data: {
        dayId: data.dayId,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        type: data.type,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        title,
        clientDescription: data.clientDescription || null,
        activityId,
        accommodationId,
        roomTypeId,
        guestsPerRoom,
        supplierId,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "itinerary.item-added",
      entityType: "ItineraryItem",
      entityId: item.id,
      next: { dayId: item.dayId, type: item.type, title: item.title },
    });
  });
  revalidatePath(`/itineraries/${data.itineraryId}`);
}

export async function duplicateItineraryDayAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const dayId = String(formData.get("dayId") ?? "");
  await prisma.$transaction(async (tx) => {
    await requireDraftVersion(tx, versionId);
    const source = await tx.itineraryDay.findUniqueOrThrow({
      where: { id: dayId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    const max = await tx.itineraryDay.aggregate({
      where: { versionId },
      _max: { dayNumber: true, date: true },
    });
    const nextDate = max._max.date ? new Date(max._max.date) : null;
    nextDate?.setUTCDate(nextDate.getUTCDate() + 1);
    const day = await tx.itineraryDay.create({
      data: {
        versionId,
        dayNumber: (max._max.dayNumber ?? 0) + 1,
        date: nextDate,
        title: `${source.title} (copy)`,
        startLocation: source.startLocation,
        endLocation: source.endLocation,
        destinationId: source.destinationId,
        clientNarrative: source.clientNarrative,
        meals: source.meals,
        transport: source.transport,
      },
    });
    for (const item of source.items) {
      await tx.itineraryItem.create({
        data: {
          dayId: day.id,
          sortOrder: item.sortOrder,
          type: item.type,
          startTime: item.startTime,
          endTime: item.endTime,
          title: item.title,
          clientDescription: item.clientDescription,
          activityId: item.activityId,
          accommodationId: item.accommodationId,
          roomTypeId: item.roomTypeId,
          guestsPerRoom: item.guestsPerRoom,
          supplierId: item.supplierId,
        },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "itinerary.day-duplicated",
      entityType: "ItineraryDay",
      entityId: day.id,
      next: { sourceDayId: source.id },
    });
  });
  revalidatePath(`/itineraries/${itineraryId}`);
}

export async function publishItineraryVersionAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  await prisma.$transaction(async (tx) => {
    const version = await requireDraftVersion(tx, versionId);
    const dayCount = await tx.itineraryDay.count({ where: { versionId } });
    if (!dayCount) throw new Error("Add at least one itinerary day before publishing.");
    await tx.itineraryVersion.updateMany({
      where: { itineraryId, status: "PUBLISHED" },
      data: { status: "SUPERSEDED" },
    });
    await tx.itineraryVersion.update({
      where: { id: versionId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await tx.itinerary.update({
      where: { id: itineraryId },
      data: { status: "PUBLISHED", currentVersionNumber: version.versionNumber },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "itinerary.version-published",
      entityType: "ItineraryVersion",
      entityId: versionId,
      next: { version: version.versionNumber, dayCount },
    });
  });
  revalidatePath(`/itineraries/${itineraryId}`);
}

export async function createItineraryRevisionAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const sourceVersionId = String(formData.get("versionId") ?? "");
  const changeNote = String(formData.get("changeNote") ?? "").trim();
  await prisma.$transaction(async (tx) => {
    const source = await tx.itineraryVersion.findUniqueOrThrow({
      where: { id: sourceVersionId },
      include: { days: { include: { items: true }, orderBy: { dayNumber: "asc" } } },
    });
    const latest = await tx.itineraryVersion.aggregate({
      where: { itineraryId },
      _max: { versionNumber: true },
    });
    const version = await tx.itineraryVersion.create({
      data: {
        itineraryId,
        versionNumber: (latest._max.versionNumber ?? 0) + 1,
        title: source.title,
        introduction: source.introduction,
        summary: source.summary,
        inclusions: source.inclusions,
        exclusions: source.exclusions,
        importantNotes: source.importantNotes,
        terms: source.terms,
        changeNote: changeNote || `Revision of version ${source.versionNumber}`,
        createdById: actor.id,
      },
    });
    for (const sourceDay of source.days) {
      const day = await tx.itineraryDay.create({
        data: {
          versionId: version.id,
          dayNumber: sourceDay.dayNumber,
          date: sourceDay.date,
          title: sourceDay.title,
          startLocation: sourceDay.startLocation,
          endLocation: sourceDay.endLocation,
          destinationId: sourceDay.destinationId,
          clientNarrative: sourceDay.clientNarrative,
          meals: sourceDay.meals,
          transport: sourceDay.transport,
        },
      });
      for (const item of sourceDay.items) {
        await tx.itineraryItem.create({
          data: {
            dayId: day.id,
            sortOrder: item.sortOrder,
            type: item.type,
            startTime: item.startTime,
            endTime: item.endTime,
            title: item.title,
            clientDescription: item.clientDescription,
            activityId: item.activityId,
            accommodationId: item.accommodationId,
            roomTypeId: item.roomTypeId,
            guestsPerRoom: item.guestsPerRoom,
            supplierId: item.supplierId,
          },
        });
      }
    }
    await tx.itinerary.update({
      where: { id: itineraryId },
      data: { status: "DRAFT", currentVersionNumber: version.versionNumber },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "itinerary.revision-created",
      entityType: "ItineraryVersion",
      entityId: version.id,
      next: { sourceVersionId, version: version.versionNumber },
    });
  });
  revalidatePath(`/itineraries/${itineraryId}`);
}
