"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";
import { calculateOperationalReadiness, nextOperationalStatus } from "../services/readiness";
import { initializeTourOperations } from "../services/initialize-operations";

const optionalText = z.string().trim().optional().default("");
const documentTypes = [
  "FULL_OPERATIONS_PACK",
  "GUIDE_BRIEF",
  "ROOMING_LIST",
  "SUPPLIER_VOUCHER",
  "VEHICLE_ALLOCATION",
  "DAILY_OPERATIONS_SHEET",
] as const;

function parseDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Select a valid ${label.toLowerCase()}.`);
  }
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) {
    throw new Error(`Select a valid ${label.toLowerCase()}.`);
  }
  return result;
}

function resourceName(entry: {
  vehicle?: { registration: string; make: string; model: string } | null;
  driver?: { fullName: string } | null;
  guide?: { fullName: string } | null;
  equipment?: { name: string } | null;
}) {
  if (entry.vehicle) {
    return `${entry.vehicle.registration} - ${entry.vehicle.make} ${entry.vehicle.model}`;
  }
  return entry.driver?.fullName ?? entry.guide?.fullName ?? entry.equipment?.name ?? "Unknown";
}


export async function initializeTourOperationsAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({ tourId: z.string().uuid() })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const result = await initializeTourOperations(tx, {
      tourId: data.tourId,
      actorId: actor.id,
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.initialized",
      entityType: "Tour",
      entityId: data.tourId,
      next: result,
    });
  });

  revalidatePath("/operations");
  revalidatePath(`/tours/${data.tourId}`);
}

export async function createOperationalTaskAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      tourId: z.string().uuid(),
      title: z.string().trim().min(2),
      description: optionalText,
      dueDate: optionalText,
      mandatory: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const task = await tx.operationalTask.create({
      data: {
        tourId: data.tourId,
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate ? parseDate(data.dueDate, "Due date") : null,
        mandatory: data.mandatory === "on",
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.task-created",
      entityType: "OperationalTask",
      entityId: task.id,
      next: { tourId: data.tourId, title: task.title, mandatory: task.mandatory },
    });
  });

  revalidatePath("/operations");
}

export async function setOperationalTaskStatusAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      taskId: z.string().uuid(),
      status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "WAIVED"]),
      reason: optionalText,
    })
    .parse(Object.fromEntries(formData));
  if (data.status === "WAIVED" && data.reason.length < 5) {
    throw new Error("Enter a reason for waiving a task.");
  }

  await prisma.$transaction(async (tx) => {
    const previous = await tx.operationalTask.findUniqueOrThrow({
      where: { id: data.taskId },
    });
    const terminal = ["COMPLETED", "WAIVED"].includes(data.status);
    await tx.operationalTask.update({
      where: { id: previous.id },
      data: {
        status: data.status,
        completedAt: terminal ? new Date() : null,
        completedById: terminal ? actor.id : null,
        waivedReason: data.status === "WAIVED" ? data.reason : null,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.task-status-changed",
      entityType: "OperationalTask",
      entityId: previous.id,
      previous: { status: previous.status },
      next: { status: data.status, reason: data.reason || undefined },
    });
  });

  revalidatePath("/operations");
}

export async function createSupplierConfirmationAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      tourId: z.string().uuid(),
      supplierId: z.string().uuid(),
      service: z.string().trim().min(2),
      serviceDate: optionalText,
      externalReference: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const confirmation = await tx.supplierConfirmation.create({
      data: {
        tourId: data.tourId,
        supplierId: data.supplierId,
        service: data.service,
        serviceDate: data.serviceDate
          ? parseDate(data.serviceDate, "Service date")
          : null,
        externalReference: data.externalReference || null,
        notes: data.notes || null,
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.supplier-confirmation-created",
      entityType: "SupplierConfirmation",
      entityId: confirmation.id,
      next: {
        tourId: data.tourId,
        supplierId: data.supplierId,
        service: data.service,
      },
    });
  });

  revalidatePath("/operations");
}

export async function setSupplierConfirmationStatusAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      confirmationId: z.string().uuid(),
      status: z.enum(["PENDING", "REQUESTED", "CONFIRMED", "DECLINED", "CANCELLED"]),
      confirmedByName: optionalText,
      externalReference: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  if (data.status === "CONFIRMED" && !data.confirmedByName) {
    throw new Error("Record who confirmed the supplier service.");
  }

  await prisma.$transaction(async (tx) => {
    const previous = await tx.supplierConfirmation.findUniqueOrThrow({
      where: { id: data.confirmationId },
    });
    await tx.supplierConfirmation.update({
      where: { id: previous.id },
      data: {
        status: data.status,
        requestedAt:
          data.status === "REQUESTED"
            ? previous.requestedAt ?? new Date()
            : previous.requestedAt,
        confirmedAt: data.status === "CONFIRMED" ? new Date() : null,
        confirmedByName: data.confirmedByName || null,
        externalReference:
          data.externalReference || previous.externalReference,
        notes: data.notes || previous.notes,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.supplier-confirmation-status-changed",
      entityType: "SupplierConfirmation",
      entityId: previous.id,
      previous: { status: previous.status },
      next: {
        status: data.status,
        confirmedByName: data.confirmedByName || undefined,
      },
    });
  });

  revalidatePath("/operations");
}

export async function reportTourIncidentAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      tourId: z.string().uuid(),
      title: z.string().trim().min(3),
      description: z.string().trim().min(10),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      occurredAt: z.string().min(1),
      location: optionalText,
      peopleInvolved: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const occurredAt = new Date(data.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error("Select a valid incident time.");
  }

  await prisma.$transaction(async (tx) => {
    const incident = await tx.tourIncident.create({
      data: {
        reference: await nextReference(tx, "incident", "INC", occurredAt),
        tourId: data.tourId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        occurredAt,
        location: data.location || null,
        peopleInvolved: data.peopleInvolved || null,
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.incident-reported",
      entityType: "TourIncident",
      entityId: incident.id,
      next: {
        reference: incident.reference,
        tourId: data.tourId,
        severity: data.severity,
      },
    });
  });

  revalidatePath("/operations");
}

export async function resolveTourIncidentAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      incidentId: z.string().uuid(),
      resolution: z.string().trim().min(10),
      status: z.enum(["RESOLVED", "CLOSED"]),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const previous = await tx.tourIncident.findUniqueOrThrow({
      where: { id: data.incidentId },
    });
    if (["RESOLVED", "CLOSED"].includes(previous.status)) {
      throw new Error("This incident is already resolved.");
    }
    await tx.tourIncident.update({
      where: { id: previous.id },
      data: {
        status: data.status,
        resolution: data.resolution,
        resolvedAt: new Date(),
        resolvedById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.incident-resolved",
      entityType: "TourIncident",
      entityId: previous.id,
      previous: { status: previous.status },
      next: { status: data.status, resolution: data.resolution },
    });
  });

  revalidatePath("/operations");
}

export async function refreshTourReadinessAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({ tourId: z.string().uuid() })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const tour = await tx.tour.findUniqueOrThrow({
      where: { id: data.tourId },
      include: {
        booking: {
          select: {
            status: true,
            acceptedItineraryVersionId: true,
            travellers: { select: { id: true } },
          },
        },
        resourceAssignments: {
          where: { status: { not: "CANCELLED" } },
        },
        operationalTasks: true,
        supplierConfirmations: true,
        incidents: true,
      },
    });
    const readiness = calculateOperationalReadiness({
      bookingStatus: tour.booking?.status ?? null,
      acceptedItineraryVersionId:
        tour.booking?.acceptedItineraryVersionId ?? null,
      travellerCount: tour.booking?.travellers.length ?? 0,
      tourStartDate: tour.startDate,
      tourEndDate: tour.endDate,
      assignments: tour.resourceAssignments,
      tasks: tour.operationalTasks,
      incidents: tour.incidents,
    });
    const nextStatus = nextOperationalStatus(tour.status, readiness.ready);
    if (tour.status !== nextStatus) {
      await tx.tour.update({
        where: { id: tour.id },
        data: { status: nextStatus },
      });
      await tx.tourStatusHistory.create({
        data: {
          tourId: tour.id,
          fromStatus: tour.status,
          toStatus: nextStatus,
          reason: readiness.ready
            ? "All operational readiness controls passed."
            : `Readiness blockers: ${readiness.blockers.join(", ")}`,
          changedById: actor.id,
        },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.readiness-evaluated",
      entityType: "Tour",
      entityId: tour.id,
      previous: { status: tour.status },
      next: {
        status: nextStatus,
        ready: readiness.ready,
        score: readiness.score,
        blockers: readiness.blockers,
      },
    });
  });

  revalidatePath("/operations");
  revalidatePath(`/tours/${data.tourId}`);
}

export async function generateOperationalDocumentAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      tourId: z.string().uuid(),
      documentType: z.enum(documentTypes),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const tour = await tx.tour.findUniqueOrThrow({
      where: { id: data.tourId },
      include: {
        customer: { select: { fullName: true, phone: true, email: true } },
        booking: {
          include: {
            travellers: {
              include: {
                traveller: {
                  select: {
                    fullName: true,
                    dateOfBirth: true,
                    nationality: true,
                    passportNumber: true,
                    dietaryNeeds: true,
                    accessibilityNote: true,
                  },
                },
              },
            },
            acceptedItineraryVersion: {
              include: {
                days: {
                  include: { items: { orderBy: { sortOrder: "asc" } } },
                  orderBy: { dayNumber: "asc" },
                },
              },
            },
          },
        },
        resourceAssignments: {
          where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
          include: {
            vehicle: { select: { registration: true, make: true, model: true } },
            driver: { select: { fullName: true, phone: true } },
            guide: { select: { fullName: true, phone: true } },
            equipment: { select: { name: true } },
          },
          orderBy: { resourceType: "asc" },
        },
        operationalTasks: { orderBy: { dueDate: "asc" } },
        supplierConfirmations: {
          include: { supplier: { select: { name: true, phone: true, email: true } } },
          orderBy: { serviceDate: "asc" },
        },
      },
    });
    if (!tour.booking) {
      throw new Error("An operations document requires a confirmed booking.");
    }
    const reference = await nextReference(
      tx,
      "operation_document",
      "OPS",
    );
    const title = data.documentType
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
    const snapshot: Prisma.InputJsonValue = {
      generatedAt: new Date().toISOString(),
      tour: {
        reference: tour.reference,
        name: tour.name,
        startDate: tour.startDate.toISOString(),
        endDate: tour.endDate.toISOString(),
        customer: tour.customer,
        notes: tour.notes,
      },
      booking: {
        reference: tour.booking.reference,
        status: tour.booking.status,
        travellers: tour.booking.travellers.map((entry) => ({
          isLead: entry.isLead,
          fullName: entry.traveller.fullName,
          dateOfBirth: entry.traveller.dateOfBirth?.toISOString() ?? null,
          nationality: entry.traveller.nationality,
          passportNumber: entry.traveller.passportNumber,
          dietaryRequirements: entry.traveller.dietaryNeeds,
          medicalNotes: entry.traveller.accessibilityNote,
        })),
      },
      assignments: tour.resourceAssignments.map((entry) => ({
        type: entry.resourceType,
        resource: resourceName(entry),
        startDate: entry.startDate.toISOString(),
        endDate: entry.endDate.toISOString(),
        notes: entry.notes,
      })),
      confirmations: tour.supplierConfirmations.map((entry) => ({
        supplier: entry.supplier.name,
        service: entry.service,
        serviceDate: entry.serviceDate?.toISOString() ?? null,
        status: entry.status,
        externalReference: entry.externalReference,
        phone: entry.supplier.phone,
        email: entry.supplier.email,
      })),
      tasks: tour.operationalTasks.map((entry) => ({
        title: entry.title,
        status: entry.status,
        mandatory: entry.mandatory,
        dueDate: entry.dueDate?.toISOString() ?? null,
      })),
      itinerary:
        tour.booking.acceptedItineraryVersion?.days.map((day) => ({
          dayNumber: day.dayNumber,
          date: day.date?.toISOString() ?? null,
          title: day.title,
          startLocation: day.startLocation,
          endLocation: day.endLocation,
          supplierNotes: day.supplierNotes,
          items: day.items.map((item) => ({
            type: item.type,
            startTime: item.startTime,
            endTime: item.endTime,
            title: item.title,
          })),
        })) ?? [],
    };
    const result = await tx.operationalDocument.create({
      data: {
        reference,
        tourId: tour.id,
        documentType: data.documentType,
        title,
        fileName: `${reference}-${data.documentType.toLowerCase()}.pdf`,
        snapshot,
        generatedById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "operations.document-generated",
      entityType: "OperationalDocument",
      entityId: result.id,
      next: {
        reference,
        tourId: tour.id,
        documentType: data.documentType,
      },
    });
    return result;
  });

  revalidatePath("/operations");

}
