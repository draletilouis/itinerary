import { prisma } from "@/server/db/prisma";

export async function getCatalogue() {
  const [destinations, supplierCategories, suppliers, activities, accommodations, currencies] =
    await Promise.all([
      prisma.destination.findMany({
        orderBy: [{ country: "asc" }, { name: "asc" }],
        include: { _count: { select: { activities: true, accommodations: true } } },
      }),
      prisma.supplierCategory.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        include: { _count: { select: { suppliers: true } } },
      }),
      prisma.supplier.findMany({
        orderBy: { name: "asc" },
        include: {
          category: true,
          rates: { where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } },
          _count: { select: { activities: true, accommodations: true } },
        },
      }),
      prisma.activity.findMany({
        orderBy: { name: "asc" },
        include: {
          destination: { select: { name: true } },
          rates: { orderBy: { startDate: "desc" }, take: 3 },
        },
      }),
      prisma.accommodation.findMany({
        orderBy: { name: "asc" },
        include: {
          destination: { select: { name: true } },
          roomTypes: { orderBy: { name: "asc" } },
          rates: { orderBy: { startDate: "desc" }, take: 3 },
        },
      }),
      prisma.currency.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    ]);
  return { destinations, supplierCategories, suppliers, activities, accommodations, currencies };
}