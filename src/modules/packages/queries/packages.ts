import { prisma } from "@/server/db/prisma";
import { packageCosts, packageDays } from "../templates";

export async function listTourPackages() {
  const packages = await prisma.tourPackage.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
    include: {
      createdBy: { select: { fullName: true } },
      _count: { select: { tours: true } },
    },
  });
  return packages.map((entry) => ({
    ...entry,
    days: packageDays(entry.itineraryTemplate),
    costs: packageCosts(entry.costTemplate),
  }));
}

export async function getTourPackage(id: string) {
  const entry = await prisma.tourPackage.findUnique({
    where: { id },
    include: {
      createdBy: { select: { fullName: true } },
      _count: { select: { tours: true } },
    },
  });
  if (!entry) return null;
  return {
    ...entry,
    days: packageDays(entry.itineraryTemplate),
    costs: packageCosts(entry.costTemplate),
  };
}

export async function getPackageOptions() {
  const [currencies, destinations, activities, accommodations, suppliers] =
    await Promise.all([
      prisma.currency.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
      prisma.destination.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
      prisma.activity.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
      prisma.accommodation.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        include: { roomTypes: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } } },
      }),
      prisma.supplier.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    ]);
  return { currencies, destinations, activities, accommodations, suppliers };
}
