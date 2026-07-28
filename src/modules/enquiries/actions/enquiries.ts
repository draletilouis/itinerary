"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";
import {
  communicationSchema,
  enquirySchema,
  followUpSchema,
} from "../schemas/enquiry";

const nullable = (value: string) => value || null;
const csv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export async function createEnquiryAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid enquiry details.");
  }

  const enquiry = await prisma.$transaction(async (tx) => {
    const reference = await nextReference(tx, "enquiry", "ENQ");
    const created = await tx.enquiry.create({
      data: {
        reference,
        customerId: parsed.data.customerId,
        source: parsed.data.source,
        assignedToId: actor.id,
        createdById: actor.id,
        proposedStartDate: parsed.data.proposedStartDate
          ? new Date(parsed.data.proposedStartDate)
          : null,
        proposedEndDate: parsed.data.proposedEndDate
          ? new Date(parsed.data.proposedEndDate)
          : null,
        flexibleDates: parsed.data.flexibleDates,
        adults: parsed.data.adults,
        children: parsed.data.children,
        childAges: csv(parsed.data.childAges)
          .map(Number)
          .filter((age) => Number.isInteger(age) && age >= 0),
        rooms: parsed.data.rooms === "" ? null : parsed.data.rooms,
        destinationsOfInterest: csv(parsed.data.destinationsOfInterest),
        arrivalLocation: nullable(parsed.data.arrivalLocation),
        departureLocation: nullable(parsed.data.departureLocation),
        customerBudget: parsed.data.customerBudget
          ? new Prisma.Decimal(parsed.data.customerBudget)
          : null,
        budgetCurrencyCode: nullable(parsed.data.budgetCurrencyCode),
        accommodationPreference: nullable(parsed.data.accommodationPreference),
        activityInterests: csv(parsed.data.activityInterests),
        transportPreference: nullable(parsed.data.transportPreference),
        dietaryRequirements: nullable(parsed.data.dietaryRequirements),
        accessibilityRequirements: nullable(
          parsed.data.accessibilityRequirements,
        ),
        specialRequests: nullable(parsed.data.specialRequests),
        notes: nullable(parsed.data.notes),
        followUpAt: parsed.data.followUpAt
          ? new Date(parsed.data.followUpAt)
          : null,
      },
    });
    await tx.enquiryStatusHistory.create({
      data: {
        enquiryId: created.id,
        toStatus: "NEW",
        changedById: actor.id,
      },
    });
    if (parsed.data.followUpAt) {
      await tx.enquiryFollowUp.create({
        data: {
          enquiryId: created.id,
          scheduledFor: new Date(parsed.data.followUpAt),
          assignedToId: actor.id,
          createdById: actor.id,
          notes: "Initial enquiry follow-up",
        },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "enquiry.created",
      entityType: "Enquiry",
      entityId: created.id,
      next: {
        reference: created.reference,
        customerId: created.customerId,
        status: created.status,
      },
    });
    return created;
  });

  redirect(`/enquiries/${enquiry.id}`);
}

const statuses = [
  "NEW",
  "CONTACTED",
  "QUALIFYING",
  "PLANNING",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "CONFIRMED",
  "LOST",
  "CANCELLED",
] as const;

export async function setEnquiryStatusAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = z
    .object({
      enquiryId: z.string().uuid(),
      status: z.enum(statuses),
      reason: z.string().trim().optional().default(""),
    })
    .parse(Object.fromEntries(formData));

  if (["LOST", "CANCELLED"].includes(parsed.status) && !parsed.reason) {
    throw new Error("Enter a reason before closing this enquiry.");
  }

  await prisma.$transaction(async (tx) => {
    const previous = await tx.enquiry.findUniqueOrThrow({
      where: { id: parsed.enquiryId },
    });
    if (previous.status === parsed.status) return;
    await tx.enquiry.update({
      where: { id: parsed.enquiryId },
      data: {
        status: parsed.status,
        lossReason: parsed.status === "LOST" ? parsed.reason : previous.lossReason,
      },
    });
    await tx.enquiryStatusHistory.create({
      data: {
        enquiryId: parsed.enquiryId,
        fromStatus: previous.status,
        toStatus: parsed.status,
        reason: nullable(parsed.reason),
        changedById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "enquiry.status-changed",
      entityType: "Enquiry",
      entityId: parsed.enquiryId,
      previous: { status: previous.status },
      next: { status: parsed.status, reason: parsed.reason || undefined },
    });
  });

  revalidatePath(`/enquiries/${parsed.enquiryId}`);
  revalidatePath("/enquiries");
}

export async function addCommunicationAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = communicationSchema.parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    const communication = await tx.communication.create({
      data: {
        enquiryId: parsed.enquiryId,
        channel: parsed.channel,
        direction: parsed.direction,
        subject: nullable(parsed.subject),
        content: parsed.content,
        occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : new Date(),
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "enquiry.communication-added",
      entityType: "Enquiry",
      entityId: parsed.enquiryId,
      next: { communicationId: communication.id, channel: communication.channel },
    });
  });
  revalidatePath(`/enquiries/${parsed.enquiryId}`);
}

export async function scheduleFollowUpAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = followUpSchema.parse(Object.fromEntries(formData));
  const scheduledFor = new Date(parsed.scheduledFor);
  await prisma.$transaction(async (tx) => {
    const followUp = await tx.enquiryFollowUp.create({
      data: {
        enquiryId: parsed.enquiryId,
        scheduledFor,
        notes: nullable(parsed.notes),
        assignedToId: parsed.assignedToId || actor.id,
        createdById: actor.id,
      },
    });
    await tx.enquiry.update({
      where: { id: parsed.enquiryId },
      data: { followUpAt: scheduledFor },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "enquiry.follow-up-scheduled",
      entityType: "Enquiry",
      entityId: parsed.enquiryId,
      next: { followUpId: followUp.id, scheduledFor },
    });
  });
  revalidatePath(`/enquiries/${parsed.enquiryId}`);
}

export async function completeFollowUpAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const followUpId = String(formData.get("followUpId") ?? "");
  const enquiryId = String(formData.get("enquiryId") ?? "");
  const outcome = String(formData.get("outcome") ?? "").trim();
  await prisma.$transaction(async (tx) => {
    await tx.enquiryFollowUp.update({
      where: { id: followUpId },
      data: { status: "COMPLETED", completedAt: new Date(), outcome: outcome || null },
    });
    const next = await tx.enquiryFollowUp.findFirst({
      where: { enquiryId, status: "PENDING" },
      orderBy: { scheduledFor: "asc" },
    });
    await tx.enquiry.update({
      where: { id: enquiryId },
      data: { followUpAt: next?.scheduledFor ?? null },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "enquiry.follow-up-completed",
      entityType: "Enquiry",
      entityId: enquiryId,
      next: { followUpId, outcome: outcome || undefined },
    });
  });
  revalidatePath(`/enquiries/${enquiryId}`);
}

export async function duplicateEnquiryAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const enquiryId = String(formData.get("enquiryId") ?? "");
  const created = await prisma.$transaction(async (tx) => {
    const source = await tx.enquiry.findUniqueOrThrow({ where: { id: enquiryId } });
    const reference = await nextReference(tx, "enquiry", "ENQ");
    const duplicate = await tx.enquiry.create({
      data: {
        reference,
        customerId: source.customerId,
        source: source.source,
        assignedToId: actor.id,
        createdById: actor.id,
        proposedStartDate: source.proposedStartDate,
        proposedEndDate: source.proposedEndDate,
        flexibleDates: source.flexibleDates,
        adults: source.adults,
        children: source.children,
        childAges: source.childAges,
        rooms: source.rooms,
        destinationsOfInterest: source.destinationsOfInterest,
        arrivalLocation: source.arrivalLocation,
        departureLocation: source.departureLocation,
        customerBudget: source.customerBudget,
        budgetCurrencyCode: source.budgetCurrencyCode,
        accommodationPreference: source.accommodationPreference,
        activityInterests: source.activityInterests,
        transportPreference: source.transportPreference,
        dietaryRequirements: source.dietaryRequirements,
        accessibilityRequirements: source.accessibilityRequirements,
        specialRequests: source.specialRequests,
        notes: source.notes,
      },
    });
    await tx.enquiryStatusHistory.create({
      data: { enquiryId: duplicate.id, toStatus: "NEW", changedById: actor.id },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "enquiry.duplicated",
      entityType: "Enquiry",
      entityId: duplicate.id,
      next: { sourceEnquiryId: source.id, reference: duplicate.reference },
    });
    return duplicate;
  });
  redirect(`/enquiries/${created.id}`);
}

const convertSchema = z.object({
  enquiryId: z.string().uuid(),
  name: z.string().trim().min(2),
  type: z.enum([
    "CUSTOM",
    "STANDARD_PACKAGE",
    "GROUP_DEPARTURE",
    "PRIVATE",
    "CORPORATE",
    "SCHOOL",
    "DAY",
    "MULTI_DAY",
  ]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  costingCurrencyCode: z.string().length(3),
  quotationCurrencyCode: z.string().length(3),
});

export async function convertEnquiryToTourAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = convertSchema.parse(Object.fromEntries(formData));
  if (new Date(parsed.endDate) < new Date(parsed.startDate)) {
    throw new Error("Tour end date cannot be before the start date.");
  }

  const tour = await prisma.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.findUniqueOrThrow({
      where: { id: parsed.enquiryId },
    });
    const reference = await nextReference(tx, "tour", "TOUR");
    const created = await tx.tour.create({
      data: {
        reference,
        name: parsed.name,
        customerId: enquiry.customerId,
        sourceEnquiryId: enquiry.id,
        type: parsed.type,
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
        adults: enquiry.adults,
        children: enquiry.children,
        ownerId: actor.id,
        costingCurrencyCode: parsed.costingCurrencyCode,
        quotationCurrencyCode: parsed.quotationCurrencyCode,
        status: "PLANNING",
      },
    });
    await tx.tourStatusHistory.create({
      data: { tourId: created.id, toStatus: "PLANNING", changedById: actor.id },
    });
    await tx.enquiry.update({
      where: { id: enquiry.id },
      data: { status: "PLANNING" },
    });
    await tx.enquiryStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        fromStatus: enquiry.status,
        toStatus: "PLANNING",
        reason: `Converted to ${reference}`,
        changedById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "enquiry.converted-to-tour",
      entityType: "Tour",
      entityId: created.id,
      next: { enquiryId: enquiry.id, reference },
    });
    return created;
  });

  redirect(`/tours/${tour.id}`);
}
