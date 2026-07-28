import type { EnquiryStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

const terminalStatuses: EnquiryStatus[] = ["CONFIRMED", "LOST", "CANCELLED"];

export async function listEnquiries(input: {
  search?: string;
  status?: EnquiryStatus;
}) {
  const search = input.search?.trim();
  return prisma.enquiry.findMany({
    where: {
      status: input.status,
      OR: search
        ? [
            { reference: { contains: search, mode: "insensitive" } },
            { customer: { fullName: { contains: search, mode: "insensitive" } } },
            { destinationsOfInterest: { has: search } },
          ]
        : undefined,
    },
    orderBy: [{ followUpAt: "asc" }, { createdAt: "desc" }],
    take: 150,
    include: {
      customer: { select: { fullName: true, phone: true, email: true } },
      assignedTo: { select: { fullName: true } },
      _count: { select: { communications: true, followUps: true, tours: true } },
    },
  });
}

export async function getPipeline() {
  const enquiries = await prisma.enquiry.findMany({
    where: { status: { notIn: terminalStatuses } },
    orderBy: [{ followUpAt: "asc" }, { createdAt: "desc" }],
    include: {
      customer: { select: { fullName: true, phone: true, email: true } },
      assignedTo: { select: { fullName: true } },
    },
  });
  return enquiries;
}

export async function getEnquiry(id: string) {
  return prisma.enquiry.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedTo: { select: { id: true, fullName: true, email: true } },
      followUps: {
        orderBy: { scheduledFor: "desc" },
        include: {
          assignedTo: { select: { fullName: true } },
          createdBy: { select: { fullName: true } },
        },
      },
      communications: {
        orderBy: { occurredAt: "desc" },
        include: { createdBy: { select: { fullName: true } } },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { fullName: true } } },
      },
      tours: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reference: true, name: true, status: true },
      },
    },
  });
}

export async function getEnquiryFormOptions() {
  const [customers, currencies, users] = await Promise.all([
    prisma.customer.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, reference: true },
    }),
    prisma.currency.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);
  return { customers, currencies, users };
}
