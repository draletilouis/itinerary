import { prisma } from "@/server/db/prisma";
import { calculateOperationalReadiness } from "../services/readiness";

const resourceInclude = {
  vehicle: { select: { registration: true, make: true, model: true } },
  driver: { select: { fullName: true, phone: true } },
  guide: { select: { fullName: true, phone: true } },
  equipment: { select: { name: true } },
} as const;

export async function getOperationsWorkspace() {
  const tours = await prisma.tour.findMany({
    where: {
      status: {
        in: [
          "CONFIRMED",
          "OPERATIONAL_PREPARATION",
          "READY",
          "IN_PROGRESS",
        ],
      },
    },
    include: {
      customer: { select: { fullName: true, phone: true } },
      booking: {
        select: {
          id: true,
          reference: true,
          status: true,
          acceptedItineraryVersionId: true,
          travellers: { select: { id: true } },
        },
      },
      resourceAssignments: {
        where: { status: { not: "CANCELLED" } },
        include: resourceInclude,
        orderBy: [{ resourceType: "asc" }, { startDate: "asc" }],
      },
      operationalTasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      },
      supplierConfirmations: {
        include: { supplier: { select: { name: true } } },
        orderBy: [{ serviceDate: "asc" }, { createdAt: "asc" }],
      },
      incidents: {
        orderBy: { occurredAt: "desc" },
      },
    },
    orderBy: [{ startDate: "asc" }, { reference: "asc" }],
  });

  const suppliers = await prisma.supplier.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const preparedTours = tours.map((tour) => ({
    ...tour,
    readiness: calculateOperationalReadiness({
      bookingStatus: tour.booking?.status ?? null,
      acceptedItineraryVersionId:
        tour.booking?.acceptedItineraryVersionId ?? null,
      travellerCount: tour.booking?.travellers.length ?? 0,
      tourStartDate: tour.startDate,
      tourEndDate: tour.endDate,
      assignments: tour.resourceAssignments.map((entry) => ({
        resourceType: entry.resourceType,
        status: entry.status,
        startDate: entry.startDate,
        endDate: entry.endDate,
      })),
      tasks: tour.operationalTasks.map((entry) => ({
        mandatory: entry.mandatory,
        status: entry.status,
      })),
      incidents: tour.incidents.map((entry) => ({
        severity: entry.severity,
        status: entry.status,
      })),
    }),
  }));

  return {
    tours: preparedTours,
    suppliers,
    metrics: {
      preparing: preparedTours.filter((tour) =>
        ["CONFIRMED", "OPERATIONAL_PREPARATION"].includes(tour.status),
      ).length,
      ready: preparedTours.filter((tour) => tour.readiness.ready).length,
      active: preparedTours.filter((tour) => tour.status === "IN_PROGRESS").length,
      overdueTasks: preparedTours.reduce(
        (count, tour) =>
          count +
          tour.operationalTasks.filter(
            (task) =>
              task.dueDate &&
              task.dueDate < new Date() &&
              !["COMPLETED", "WAIVED"].includes(task.status),
          ).length,
        0,
      ),
      openIncidents: preparedTours.reduce(
        (count, tour) =>
          count +
          tour.incidents.filter(
            (incident) => !["RESOLVED", "CLOSED"].includes(incident.status),
          ).length,
        0,
      ),
    },
  };
}

export type OperationsWorkspace = Awaited<ReturnType<typeof getOperationsWorkspace>>;
