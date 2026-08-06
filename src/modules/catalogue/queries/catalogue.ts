import { prisma } from "@/server/db/prisma";
import { getPricingCurrencyCodes } from "@/modules/costing/services/pricing-currencies";

export async function getCatalogue() {
  const pricingCurrencyCodes = await getPricingCurrencyCodes();
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
          rates: {
            where: { status: "ACTIVE", currencyCode: { in: pricingCurrencyCodes } },
            orderBy: { startDate: "desc" },
          },
          _count: { select: { activities: true, accommodations: true } },
        },
      }),
      prisma.activity.findMany({
        orderBy: { name: "asc" },
        include: {
          destination: { select: { name: true } },
          rates: { where: { currencyCode: { in: pricingCurrencyCodes } }, orderBy: { startDate: "desc" }, take: 3 },
        },
      }),
      prisma.accommodation.findMany({
        orderBy: { name: "asc" },
        include: {
          destination: { select: { name: true } },
          roomTypes: { orderBy: { name: "asc" } },
          rates: { where: { currencyCode: { in: pricingCurrencyCodes } }, orderBy: { startDate: "desc" }, take: 3 },
        },
      }),
      prisma.currency.findMany({
        where: { active: true, code: { in: pricingCurrencyCodes } },
        orderBy: { code: "asc" },
      }),
    ]);
  return { destinations, supplierCategories, suppliers, activities, accommodations, currencies };
}
