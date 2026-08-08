"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";
import { calculateOperationalReadiness, nextOperationalStatus } from "../services/readiness";
import { initializeTourOperations } from "../services/initialize-operations";

const optionalText = z.string().trim().optional().default("");

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

