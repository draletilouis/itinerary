import type { Prisma } from "@prisma/client";

export const defaultOperationalTasks = [
  "Confirm accommodation suppliers",
  "Confirm activity suppliers",
  "Confirm transport suppliers",
  "Assign vehicle",
  "Assign driver",
  "Assign guide",
  "Collect traveller documents",
  "Prepare operational vouchers",
  "Verify required customer payments",
  "Inspect assigned vehicle",
  "Brief guide and driver",
] as const;

const optionalOperationalTasks = new Set<string>([
  "Confirm accommodation suppliers",
  "Confirm activity suppliers",
  "Confirm transport suppliers",
]);

type InitializeOperationsResult = {
  tasksCreated: number;
  supplierConfirmationsCreated: number;
};

function serviceDate(startDate: Date, dayNumber?: number | null) {
  if (!dayNumber) return null;
  const date = new Date(startDate);
  date.setUTCDate(date.getUTCDate() + dayNumber - 1);
  return date;
}

function confirmationKey(supplierId: string, service: string, date: Date | null) {
  return `${supplierId}|${service.trim().toLowerCase()}|${date?.toISOString().slice(0, 10) ?? ""}`;
}

export async function initializeTourOperations(
  tx: Prisma.TransactionClient,
  input: { tourId: string; actorId: string },
): Promise<InitializeOperationsResult> {
  const tour = await tx.tour.findUniqueOrThrow({
    where: { id: input.tourId },
    select: {
      id: true,
      startDate: true,
      status: true,
      booking: { select: { acceptedItineraryVersionId: true } },
      costItems: {
        where: { archivedAt: null, supplierId: { not: null } },
        select: {
          supplierId: true,
          description: true,
          category: true,
          itineraryDay: { select: { dayNumber: true } },
        },
      },
    },
  });

  if (["CANCELLED", "ARCHIVED"].includes(tour.status)) {
    throw new Error("A closed tour cannot be prepared for operations.");
  }

  const existingTasks = await tx.operationalTask.findMany({
    where: { tourId: tour.id, title: { in: [...defaultOperationalTasks] } },
    select: { title: true },
  });
  const existingTitles = new Set(existingTasks.map((entry) => entry.title));
  const dueDate = new Date(tour.startDate);
  dueDate.setUTCDate(dueDate.getUTCDate() - 3);
  const missingTasks = defaultOperationalTasks.filter((title) => !existingTitles.has(title));
  await tx.operationalTask.updateMany({
    where: { tourId: tour.id, title: { in: [...optionalOperationalTasks] } },
    data: { mandatory: false },
  });
  if (missingTasks.length) {
    await tx.operationalTask.createMany({
      data: missingTasks.map((title) => ({
        tourId: tour.id,
        title,
        dueDate,
        mandatory: !optionalOperationalTasks.has(title),
        createdById: input.actorId,
      })),
    });
  }

  const candidates = tour.costItems.flatMap((item) =>
    item.supplierId
      ? [{
          supplierId: item.supplierId,
          service: item.description || item.category,
          serviceDate: serviceDate(tour.startDate, item.itineraryDay?.dayNumber),
          notes: `Created automatically from confirmed tour costing (${item.category}).`,
        }]
      : [],
  );

  if (tour.booking?.acceptedItineraryVersionId) {
    const itineraryItems = await tx.itineraryItem.findMany({
      where: {
        day: { versionId: tour.booking.acceptedItineraryVersionId },
        supplierId: { not: null },
      },
      select: {
        supplierId: true,
        title: true,
        type: true,
        day: { select: { dayNumber: true } },
      },
    });
    for (const item of itineraryItems) {
      if (!item.supplierId) continue;
      candidates.push({
        supplierId: item.supplierId,
        service: item.title,
        serviceDate: serviceDate(tour.startDate, item.day.dayNumber),
        notes: `Created automatically from the accepted itinerary (${item.type.toLowerCase()}).`,
      });
    }
  }

  const existingConfirmations = await tx.supplierConfirmation.findMany({
    where: { tourId: tour.id },
    select: { supplierId: true, service: true, serviceDate: true },
  });
  const usedKeys = new Set(
    existingConfirmations.map((entry) =>
      confirmationKey(entry.supplierId, entry.service, entry.serviceDate),
    ),
  );
  const missingConfirmations = candidates.filter((entry) => {
    const key = confirmationKey(entry.supplierId, entry.service, entry.serviceDate);
    if (usedKeys.has(key)) return false;
    usedKeys.add(key);
    return true;
  });
  if (missingConfirmations.length) {
    await tx.supplierConfirmation.createMany({
      data: missingConfirmations.map((entry) => ({
        tourId: tour.id,
        supplierId: entry.supplierId,
        service: entry.service,
        serviceDate: entry.serviceDate,
        notes: entry.notes,
        createdById: input.actorId,
      })),
    });
  }

  if (["CONFIRMED", "READY"].includes(tour.status)) {
    await tx.tour.update({
      where: { id: tour.id },
      data: { status: "OPERATIONAL_PREPARATION" },
    });
  }

  return {
    tasksCreated: missingTasks.length,
    supplierConfirmationsCreated: missingConfirmations.length,
  };
}
