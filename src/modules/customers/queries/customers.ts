import { prisma } from "@/server/db/prisma";

export async function listCustomers(search = "") {
  return prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { organisation: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { enquiries: true, tours: true, travellers: true } },
    },
  });
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      travellers: { orderBy: { fullName: "asc" } },
      enquiries: { orderBy: { createdAt: "desc" }, take: 10 },
      tours: { orderBy: { startDate: "desc" }, take: 10 },
      bookings: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}
