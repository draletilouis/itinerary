"use server";

import {
  Prisma,
  type ResourceAssignmentStatus,
  type ResourceStatus,
  type ResourceType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";
import {
  detectResourceConflicts,
  rangesOverlap,
  resourceForeignKey,
  validateResourceRange,
} from "../services/conflicts";
import type {
  BulkResourceAssignmentRow,
  BulkResourceAssignmentState,
} from "../types";

const resourceTypes = ["VEHICLE", "DRIVER", "GUIDE", "EQUIPMENT"] as const;
const optionalText = z.string().trim().optional().default("");
const bulkAssignmentSchema = z.object({
  tourId: z.string().uuid(),
  assignments: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        resourceType: z.enum(resourceTypes),
        resourceId: z.string().uuid(),
        startDate: z.string(),
        endDate: z.string(),
        notes: z.string().trim().max(1000).optional().default(""),
        conflictOverrideReason: z.string().trim().max(500).optional().default(""),
      }),
    )
    .min(1, "Add at least one resource.")
    .max(20, "Assign no more than 20 resources at once."),
});

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

function optionalDate(value: string, label: string) {
  return value ? parseDate(value, label) : null;
}

function required(value: string, label: string) {
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function csv(value: string) {
  return [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
}

async function assertActiveResource(
  tx: Prisma.TransactionClient,
  resourceType: ResourceType,
  resourceId: string,
) {
  const select = { id: true, status: true } as const;
  const resource =
    resourceType === "VEHICLE"
      ? await tx.vehicle.findUnique({ where: { id: resourceId }, select })
      : resourceType === "DRIVER"
        ? await tx.driver.findUnique({ where: { id: resourceId }, select })
        : resourceType === "GUIDE"
          ? await tx.guide.findUnique({ where: { id: resourceId }, select })
          : await tx.equipment.findUnique({ where: { id: resourceId }, select });
  if (!resource) throw new Error("Resource not found.");
  if (resource.status !== "ACTIVE") {
    throw new Error("Only active resources can be scheduled.");
  }
}

export async function createResourceAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      resourceType: z.enum(resourceTypes),
      name: optionalText,
      registration: optionalText,
      make: optionalText,
      model: optionalText,
      vehicleType: optionalText,
      capacity: optionalText,
      ownership: optionalText,
      manufactureYear: optionalText,
      colour: optionalText,
      phone: optionalText,
      email: optionalText,
      licenceNumber: optionalText,
      licenceClass: optionalText,
      licenceExpiry: optionalText,
      emergencyContact: optionalText,
      languages: optionalText,
      specialities: optionalText,
      certification: optionalText,
      certificationExpiry: optionalText,
      category: optionalText,
      quantity: optionalText,
      supplierId: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    let record: { id: string; reference: string };
    if (data.resourceType === "VEHICLE") {
      const capacity = Number(required(data.capacity, "Capacity"));
      if (!Number.isInteger(capacity) || capacity < 1) {
        throw new Error("Vehicle capacity must be a positive whole number.");
      }
      const manufactureYear = data.manufactureYear ? Number(data.manufactureYear) : null;
      if (
        manufactureYear !== null &&
        (!Number.isInteger(manufactureYear) ||
          manufactureYear < 1900 ||
          manufactureYear > new Date().getUTCFullYear() + 1)
      ) {
        throw new Error("Enter a valid manufacture year.");
      }
      record = await tx.vehicle.create({
        data: {
          reference: await nextReference(tx, "vehicle", "VEH"),
          registration: required(data.registration, "Registration").toUpperCase(),
          make: required(data.make, "Make"),
          model: required(data.model, "Model"),
          vehicleType: required(data.vehicleType, "Vehicle type"),
          capacity,
          ownership: required(data.ownership, "Ownership"),
          manufactureYear,
          colour: data.colour || null,
          supplierId: data.supplierId || null,
          notes: data.notes || null,
        },
      });
    } else if (data.resourceType === "DRIVER") {
      record = await tx.driver.create({
        data: {
          reference: await nextReference(tx, "driver", "DRV"),
          fullName: required(data.name, "Driver name"),
          phone: required(data.phone, "Phone"),
          email: data.email || null,
          licenceNumber: required(data.licenceNumber, "Licence number"),
          licenceClass: data.licenceClass || null,
          licenceExpiry: optionalDate(data.licenceExpiry, "Licence expiry"),
          emergencyContact: data.emergencyContact || null,
          supplierId: data.supplierId || null,
          notes: data.notes || null,
        },
      });
    } else if (data.resourceType === "GUIDE") {
      record = await tx.guide.create({
        data: {
          reference: await nextReference(tx, "guide", "GDE"),
          fullName: required(data.name, "Guide name"),
          phone: required(data.phone, "Phone"),
          email: data.email || null,
          languages: csv(data.languages),
          specialities: csv(data.specialities),
          certification: data.certification || null,
          certificationExpiry: optionalDate(
            data.certificationExpiry,
            "Certification expiry",
          ),
          supplierId: data.supplierId || null,
          notes: data.notes || null,
        },
      });
    } else {
      const quantity = Number(data.quantity || "1");
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Equipment quantity must be a positive whole number.");
      }
      record = await tx.equipment.create({
        data: {
          reference: await nextReference(tx, "equipment", "EQP"),
          name: required(data.name, "Equipment name"),
          category: required(data.category, "Category"),
          quantity,
          notes: data.notes || null,
        },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "resource.created",
      entityType: data.resourceType,
      entityId: record.id,
      next: { reference: record.reference, type: data.resourceType },
    });
  });

  revalidatePath("/resources");
}

export async function createResourceAvailabilityAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      resourceType: z.enum(resourceTypes),
      resourceId: z.string().uuid(),
      type: z.enum(["AVAILABLE", "UNAVAILABLE", "LEAVE", "RESERVED"]),
      startDate: z.string(),
      endDate: z.string(),
      reason: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const startDate = parseDate(data.startDate, "Start date");
  const endDate = parseDate(data.endDate, "End date");
  validateResourceRange({ startDate, endDate });

  await prisma.$transaction(async (tx) => {
    await assertActiveResource(tx, data.resourceType, data.resourceId);
    const availability = await tx.resourceAvailability.create({
      data: {
        resourceType: data.resourceType,
        ...resourceForeignKey(data.resourceType, data.resourceId),
        type: data.type,
        startDate,
        endDate,
        reason: data.reason || null,
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "resource.availability-created",
      entityType: "ResourceAvailability",
      entityId: availability.id,
      next: {
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  });

  revalidatePath("/resources");
}

export async function createVehicleMaintenanceAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      vehicleId: z.string().uuid(),
      startDate: z.string(),
      endDate: z.string(),
      description: z.string().trim().min(2),
      serviceProvider: optionalText,
      odometerKm: optionalText,
      cost: z.string().regex(/^\d+(\.\d{1,4})?$/),
      currencyCode: z.string().trim().length(3),
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const startDate = parseDate(data.startDate, "Start date");
  const endDate = parseDate(data.endDate, "End date");
  validateResourceRange({ startDate, endDate });
  const odometerKm = data.odometerKm ? Number(data.odometerKm) : null;
  if (odometerKm !== null && (!Number.isInteger(odometerKm) || odometerKm < 0)) {
    throw new Error("Odometer must be a positive whole number.");
  }

  await prisma.$transaction(async (tx) => {
    await assertActiveResource(tx, "VEHICLE", data.vehicleId);
    const maintenance = await tx.vehicleMaintenance.create({
      data: {
        vehicleId: data.vehicleId,
        startDate,
        endDate,
        description: data.description,
        serviceProvider: data.serviceProvider || null,
        odometerKm,
        cost: new Prisma.Decimal(data.cost),
        currencyCode: data.currencyCode.toUpperCase(),
        notes: data.notes || null,
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "vehicle.maintenance-scheduled",
      entityType: "VehicleMaintenance",
      entityId: maintenance.id,
      next: {
        vehicleId: data.vehicleId,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  });

  revalidatePath("/resources");
}

export async function assignResourceAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      tourId: z.string().uuid(),
      resourceType: z.enum(resourceTypes),
      resourceId: z.string().uuid(),
      startDate: z.string(),
      endDate: z.string(),
      notes: optionalText,
      conflictOverrideReason: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const startDate = parseDate(data.startDate, "Assignment start date");
  const endDate = parseDate(data.endDate, "Assignment end date");
  validateResourceRange({ startDate, endDate });

  await prisma.$transaction(
    async (tx) => {
      const tour = await tx.tour.findUniqueOrThrow({
        where: { id: data.tourId },
        select: { id: true, startDate: true, endDate: true, status: true },
      });
      if (["CANCELLED", "COMPLETED", "ARCHIVED"].includes(tour.status)) {
        throw new Error("Resources cannot be assigned to a closed tour.");
      }
      if (startDate < tour.startDate || endDate > tour.endDate) {
        throw new Error("Assignment dates must stay within the tour dates.");
      }
      await assertActiveResource(tx, data.resourceType, data.resourceId);
      const conflicts = await detectResourceConflicts(tx, {
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        startDate,
        endDate,
      });
      if (conflicts.length && !data.conflictOverrideReason) {
        throw new Error(`Resource conflict detected: ${conflicts.join(" ")}`);
      }
      if (conflicts.length && data.conflictOverrideReason.length < 8) {
        throw new Error("Enter a meaningful conflict override reason.");
      }

      const assignment = await tx.resourceAssignment.create({
        data: {
          tourId: data.tourId,
          resourceType: data.resourceType,
          ...resourceForeignKey(data.resourceType, data.resourceId),
          startDate,
          endDate,
          notes: data.notes || null,
          conflictOverrideReason: conflicts.length
            ? data.conflictOverrideReason
            : null,
          assignedById: actor.id,
        },
      });
      await writeAuditEvent(tx, {
        actorId: actor.id,
        action: conflicts.length
          ? "resource.assignment-conflict-overridden"
          : "resource.assigned",
        entityType: "ResourceAssignment",
        entityId: assignment.id,
        next: {
          tourId: data.tourId,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          conflicts,
          conflictOverrideReason: conflicts.length
            ? data.conflictOverrideReason
            : undefined,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  revalidatePath("/resources");
  revalidatePath("/operations");
  revalidatePath(`/tours/${data.tourId}`);
}

export async function assignResourcesBulkAction(
  _previousState: BulkResourceAssignmentState,
  formData: FormData,
): Promise<BulkResourceAssignmentState> {
  const actor = await requireCurrentUser();
  const tourId = String(formData.get("tourId") ?? "");
  let assignments: unknown;

  try {
    assignments = JSON.parse(String(formData.get("assignmentBatch") ?? "[]"));
  } catch {
    return {
      status: "error",
      message: "The resource list could not be read. Refresh the page and try again.",
      rowErrors: {},
    };
  }

  const parsed = bulkAssignmentSchema.safeParse({ tourId, assignments });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Check the selected tour and every resource row.",
      rowErrors: {},
    };
  }

  const data = parsed.data;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const tour = await tx.tour.findUnique({
          where: { id: data.tourId },
          select: { id: true, startDate: true, endDate: true, status: true },
        });
        if (!tour) {
          return {
            count: 0,
            rowErrors: {} as Record<string, string[]>,
            formError: "Tour not found.",
          };
        }
        if (["CANCELLED", "COMPLETED", "ARCHIVED"].includes(tour.status)) {
          return {
            count: 0,
            rowErrors: {} as Record<string, string[]>,
            formError: "Resources cannot be assigned to a closed tour.",
          };
        }

        const rowErrors: Record<string, string[]> = {};
        const prepared: Array<
          BulkResourceAssignmentRow & {
            startDateValue: Date;
            endDateValue: Date;
            conflicts: string[];
          }
        > = [];

        const addRowError = (rowId: string, message: string) => {
          rowErrors[rowId] = [...(rowErrors[rowId] ?? []), message];
        };

        for (const row of data.assignments) {
          try {
            const startDateValue = parseDate(
              row.startDate,
              "Assignment start date",
            );
            const endDateValue = parseDate(row.endDate, "Assignment end date");
            validateResourceRange({
              startDate: startDateValue,
              endDate: endDateValue,
            });
            if (
              startDateValue < tour.startDate ||
              endDateValue > tour.endDate
            ) {
              throw new Error("Assignment dates must stay within the tour dates.");
            }

            await assertActiveResource(
              tx,
              row.resourceType,
              row.resourceId,
            );
            const conflicts = await detectResourceConflicts(tx, {
              resourceType: row.resourceType,
              resourceId: row.resourceId,
              startDate: startDateValue,
              endDate: endDateValue,
            });

            if (conflicts.length && !row.conflictOverrideReason) {
              addRowError(
                row.id,
                `Conflict detected: ${conflicts.join(" ")}`,
              );
            } else if (
              conflicts.length &&
              row.conflictOverrideReason.length < 8
            ) {
              addRowError(
                row.id,
                "Enter a meaningful conflict override reason of at least 8 characters.",
              );
            }

            prepared.push({
              ...row,
              startDateValue,
              endDateValue,
              conflicts,
            });
          } catch (error) {
            addRowError(
              row.id,
              error instanceof Error
                ? error.message
                : "This resource row is invalid.",
            );
          }
        }

        for (let leftIndex = 0; leftIndex < prepared.length; leftIndex += 1) {
          const left = prepared[leftIndex];
          for (
            let rightIndex = leftIndex + 1;
            rightIndex < prepared.length;
            rightIndex += 1
          ) {
            const right = prepared[rightIndex];
            if (
              left.resourceType === right.resourceType &&
              left.resourceId === right.resourceId &&
              rangesOverlap(
                {
                  startDate: left.startDateValue,
                  endDate: left.endDateValue,
                },
                {
                  startDate: right.startDateValue,
                  endDate: right.endDateValue,
                },
              )
            ) {
              addRowError(
                left.id,
                "This resource is selected more than once for overlapping dates in this batch.",
              );
              addRowError(
                right.id,
                "This resource is selected more than once for overlapping dates in this batch.",
              );
            }
          }
        }

        if (Object.keys(rowErrors).length) {
          return { count: 0, rowErrors, formError: "" };
        }

        for (const row of prepared) {
          const assignment = await tx.resourceAssignment.create({
            data: {
              tourId: data.tourId,
              resourceType: row.resourceType,
              ...resourceForeignKey(row.resourceType, row.resourceId),
              startDate: row.startDateValue,
              endDate: row.endDateValue,
              status: "CONFIRMED",
              notes: row.notes || null,
              conflictOverrideReason: row.conflicts.length
                ? row.conflictOverrideReason
                : null,
              assignedById: actor.id,
            },
          });
          await writeAuditEvent(tx, {
            actorId: actor.id,
            action: row.conflicts.length
              ? "resource.assignment-conflict-overridden"
              : "resource.assigned",
            entityType: "ResourceAssignment",
            entityId: assignment.id,
            next: {
              tourId: data.tourId,
              resourceType: row.resourceType,
              resourceId: row.resourceId,
              conflicts: row.conflicts,
              conflictOverrideReason: row.conflicts.length
                ? row.conflictOverrideReason
                : undefined,
              batchSize: prepared.length,
            },
          });
        }

        return {
          count: prepared.length,
          rowErrors,
          formError: "",
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.formError || Object.keys(result.rowErrors).length) {
      return {
        status: "error",
        message:
          result.formError ||
          "No resources were assigned. Correct the highlighted rows and try again.",
        rowErrors: result.rowErrors,
      };
    }

    revalidatePath("/resources");
    revalidatePath("/operations");
    revalidatePath(`/tours/${data.tourId}`);

    return {
      status: "success",
      message: `${result.count} resource${result.count === 1 ? "" : "s"} assigned provisionally. Confirm them in Tour assignments when arrangements are final.`,
      rowErrors: {},
      submissionId: crypto.randomUUID(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "The resource batch could not be assigned.",
      rowErrors: {},
    };
  }
}

export async function setResourceAssignmentStatusAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      assignmentId: z.string().uuid(),
      status: z.enum(["PROVISIONAL", "CONFIRMED", "COMPLETED", "CANCELLED"]),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const previous = await tx.resourceAssignment.findUniqueOrThrow({
      where: { id: data.assignmentId },
    });
    if (previous.status === "CANCELLED") {
      throw new Error("A cancelled assignment cannot be reopened.");
    }
    if (previous.status === "COMPLETED" && data.status !== "COMPLETED") {
      throw new Error("A completed assignment cannot be reopened.");
    }
    await tx.resourceAssignment.update({
      where: { id: previous.id },
      data: { status: data.status as ResourceAssignmentStatus },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "resource.assignment-status-changed",
      entityType: "ResourceAssignment",
      entityId: previous.id,
      previous: { status: previous.status },
      next: { status: data.status },
    });
  });

  revalidatePath("/resources");
  revalidatePath("/operations");
}

export async function setResourceStatusAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      resourceType: z.enum(resourceTypes),
      resourceId: z.string().uuid(),
      status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_SERVICE", "ARCHIVED"]),
      reason: z.string().trim().min(3),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const status = data.status as ResourceStatus;
    const update = {
      status,
      archivedAt: status === "ARCHIVED" ? new Date() : null,
    };
    const previous =
      data.resourceType === "VEHICLE"
        ? await tx.vehicle.update({ where: { id: data.resourceId }, data: update })
        : data.resourceType === "DRIVER"
          ? await tx.driver.update({ where: { id: data.resourceId }, data: update })
          : data.resourceType === "GUIDE"
            ? await tx.guide.update({ where: { id: data.resourceId }, data: update })
            : await tx.equipment.update({ where: { id: data.resourceId }, data: update });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "resource.status-changed",
      entityType: data.resourceType,
      entityId: previous.id,
      next: { status, reason: data.reason },
    });
  });

  revalidatePath("/resources");
}
