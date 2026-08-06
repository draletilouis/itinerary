import { prisma } from "@/server/db/prisma";
import { getPricingCurrencyCodes } from "@/modules/costing/services/pricing-currencies";

export async function getResourcesWorkspace() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const pricingCurrencyCodes = await getPricingCurrencyCodes();

  const [
    vehicles,
    drivers,
    guides,
    equipment,
    assignments,
    availability,
    maintenance,
    tours,
    suppliers,
    currencies,
  ] = await Promise.all([
    prisma.vehicle.findMany({
      include: { supplier: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { registration: "asc" }],
    }),
    prisma.driver.findMany({
      include: { supplier: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { fullName: "asc" }],
    }),
    prisma.guide.findMany({
      include: { supplier: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { fullName: "asc" }],
    }),
    prisma.equipment.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.resourceAssignment.findMany({
      include: {
        tour: { select: { reference: true, name: true } },
        vehicle: { select: { registration: true, make: true, model: true } },
        driver: { select: { fullName: true } },
        guide: { select: { fullName: true } },
        equipment: { select: { name: true } },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.resourceAvailability.findMany({
      where: { endDate: { gte: today } },
      include: {
        vehicle: { select: { registration: true } },
        driver: { select: { fullName: true } },
        guide: { select: { fullName: true } },
        equipment: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
      take: 100,
    }),
    prisma.vehicleMaintenance.findMany({
      where: {
        endDate: { gte: today },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      include: { vehicle: { select: { registration: true } } },
      orderBy: { startDate: "asc" },
      take: 50,
    }),
    prisma.tour.findMany({
      where: {
        status: {
          in: [
            "PLANNING",
            "COSTING",
            "QUOTED",
            "AWAITING_CONFIRMATION",
            "CONFIRMED",
            "OPERATIONAL_PREPARATION",
            "READY",
            "IN_PROGRESS",
          ],
        },
      },
      select: {
        id: true,
        reference: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.supplier.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.currency.findMany({
      where: { active: true, code: { in: pricingCurrencyCodes } },
      select: { code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return {
    vehicles,
    drivers,
    guides,
    equipment,
    assignments,
    availability,
    maintenance,
    tours,
    suppliers,
    currencies,
    metrics: {
      activeVehicles: vehicles.filter((entry) => entry.status === "ACTIVE").length,
      activeDrivers: drivers.filter((entry) => entry.status === "ACTIVE").length,
      activeGuides: guides.filter((entry) => entry.status === "ACTIVE").length,
      currentAssignments: assignments.filter(
        (entry) =>
          ["PROVISIONAL", "CONFIRMED"].includes(entry.status) &&
          entry.endDate >= today,
      ).length,
      maintenanceBlocks: maintenance.length,
      overriddenConflicts: assignments.filter(
        (entry) =>
          entry.status !== "CANCELLED" && Boolean(entry.conflictOverrideReason),
      ).length,
    },
  };
}

export type ResourcesWorkspace = Awaited<ReturnType<typeof getResourcesWorkspace>>;
