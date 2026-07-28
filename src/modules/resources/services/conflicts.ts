import type { Prisma, ResourceType } from "@prisma/client";

type DateRange = {
  startDate: Date;
  endDate: Date;
};

export function rangesOverlap(left: DateRange, right: DateRange) {
  return left.startDate <= right.endDate && left.endDate >= right.startDate;
}

export function validateResourceRange(range: DateRange) {
  if (Number.isNaN(range.startDate.getTime()) || Number.isNaN(range.endDate.getTime())) {
    throw new Error("Select valid resource dates.");
  }
  if (range.startDate > range.endDate) {
    throw new Error("The resource end date cannot be before the start date.");
  }
}

export function resourceAssignmentWhere(
  resourceType: ResourceType,
  resourceId: string,
): Prisma.ResourceAssignmentWhereInput {
  switch (resourceType) {
    case "VEHICLE":
      return { vehicleId: resourceId };
    case "DRIVER":
      return { driverId: resourceId };
    case "GUIDE":
      return { guideId: resourceId };
    case "EQUIPMENT":
      return { equipmentId: resourceId };
  }
}

export function resourceAvailabilityWhere(
  resourceType: ResourceType,
  resourceId: string,
): Prisma.ResourceAvailabilityWhereInput {
  switch (resourceType) {
    case "VEHICLE":
      return { vehicleId: resourceId };
    case "DRIVER":
      return { driverId: resourceId };
    case "GUIDE":
      return { guideId: resourceId };
    case "EQUIPMENT":
      return { equipmentId: resourceId };
  }
}

export function resourceForeignKey(
  resourceType: ResourceType,
  resourceId: string,
) {
  switch (resourceType) {
    case "VEHICLE":
      return { vehicleId: resourceId };
    case "DRIVER":
      return { driverId: resourceId };
    case "GUIDE":
      return { guideId: resourceId };
    case "EQUIPMENT":
      return { equipmentId: resourceId };
  }
}

export async function detectResourceConflicts(
  tx: Prisma.TransactionClient,
  input: {
    resourceType: ResourceType;
    resourceId: string;
    startDate: Date;
    endDate: Date;
    excludeAssignmentId?: string;
  },
) {
  validateResourceRange(input);
  const overlaps = {
    startDate: { lte: input.endDate },
    endDate: { gte: input.startDate },
  };
  const key = resourceAssignmentWhere(input.resourceType, input.resourceId);
  const availabilityKey = resourceAvailabilityWhere(input.resourceType, input.resourceId);

  const [assignments, unavailable, maintenance] = await Promise.all([
    tx.resourceAssignment.findMany({
      where: {
        ...key,
        ...overlaps,
        status: { in: ["PROVISIONAL", "CONFIRMED"] },
        id: input.excludeAssignmentId ? { not: input.excludeAssignmentId } : undefined,
      },
      select: { tour: { select: { reference: true, name: true } } },
    }),
    tx.resourceAvailability.findMany({
      where: {
        ...availabilityKey,
        ...overlaps,
        type: { in: ["UNAVAILABLE", "LEAVE", "RESERVED"] },
      },
      select: { type: true, reason: true },
    }),
    input.resourceType === "VEHICLE"
      ? tx.vehicleMaintenance.findMany({
          where: {
            vehicleId: input.resourceId,
            ...overlaps,
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          },
          select: { description: true },
        })
      : Promise.resolve([]),
  ]);

  return [
    ...assignments.map(
      (entry) => `Assigned to ${entry.tour.reference} · ${entry.tour.name}.`,
    ),
    ...unavailable.map(
      (entry) =>
        `${entry.type.toLowerCase().replaceAll("_", " ")}${entry.reason ? `: ${entry.reason}` : "."}`,
    ),
    ...maintenance.map((entry) => `Vehicle maintenance: ${entry.description}.`),
  ];
}
