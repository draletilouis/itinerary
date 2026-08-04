"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { nextReference } from "@/modules/settings/services/reference-number";
import { writeAuditEvent } from "@/server/audit/service";
import { requireCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

const optional = z.string().trim().optional().default("");
const schema = z.object({
  customerId: optional,
  newCustomerName: optional,
  newCustomerPhone: optional,
  newCustomerEmail: z.string().trim().email().or(z.literal("")).optional().default(""),
  source: z.string().trim().min(2),
  proposedStartDate: optional,
  proposedEndDate: optional,
  flexibleDates: z.string().optional().transform((value) => value === "on"),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0),
  childAges: optional,
  rooms: z.union([z.literal(""), z.coerce.number().int().positive()]),
  destinationsOfInterest: optional,
  customerBudget: optional.refine((value) => !value || /^\d+(\.\d+)?$/.test(value), "Enter a valid budget."),
  budgetCurrencyCode: optional,
  followUpAt: optional,
  arrivalLocation: optional,
  departureLocation: optional,
  accommodationPreference: optional,
  activityInterests: optional,
  transportPreference: optional,
  dietaryRequirements: optional,
  accessibilityRequirements: optional,
  specialRequests: optional,
  notes: optional,
});

const nullable = (value: string) => value || null;
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export async function createEnquiryWithCustomerAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = schema.parse(Object.fromEntries(formData));
  if (!data.customerId && (data.newCustomerName.length < 2 || data.newCustomerPhone.length < 5)) {
    throw new Error("Select a customer or enter a new customer name and phone number.");
  }
  if (data.proposedStartDate && data.proposedEndDate && new Date(data.proposedEndDate) < new Date(data.proposedStartDate)) {
    throw new Error("The proposed end date cannot be before the start date.");
  }

  const enquiry = await prisma.$transaction(async (tx) => {
    let customerId = data.customerId;
    if (!customerId) {
      const customerReference = await nextReference(tx, "customer", "CUS");
      const customer = await tx.customer.create({ data: { reference: customerReference, type: "INDIVIDUAL", fullName: data.newCustomerName, phone: data.newCustomerPhone, email: nullable(data.newCustomerEmail.toLowerCase()), tags: [], createdById: actor.id } });
      customerId = customer.id;
      await writeAuditEvent(tx, { actorId: actor.id, action: "customer.created-inline", entityType: "Customer", entityId: customer.id, next: { reference: customer.reference, fullName: customer.fullName } });
    }

    const reference = await nextReference(tx, "enquiry", "ENQ");
    const created = await tx.enquiry.create({ data: {
      reference, customerId, source: data.source, assignedToId: actor.id, createdById: actor.id,
      proposedStartDate: data.proposedStartDate ? new Date(data.proposedStartDate) : null,
      proposedEndDate: data.proposedEndDate ? new Date(data.proposedEndDate) : null,
      flexibleDates: data.flexibleDates, adults: data.adults, children: data.children,
      childAges: list(data.childAges).map(Number).filter((age) => Number.isInteger(age) && age >= 0),
      rooms: data.rooms === "" ? null : data.rooms, destinationsOfInterest: list(data.destinationsOfInterest),
      customerBudget: data.customerBudget ? new Prisma.Decimal(data.customerBudget) : null,
      budgetCurrencyCode: nullable(data.budgetCurrencyCode), arrivalLocation: nullable(data.arrivalLocation), departureLocation: nullable(data.departureLocation),
      accommodationPreference: nullable(data.accommodationPreference), activityInterests: list(data.activityInterests), transportPreference: nullable(data.transportPreference),
      dietaryRequirements: nullable(data.dietaryRequirements), accessibilityRequirements: nullable(data.accessibilityRequirements), specialRequests: nullable(data.specialRequests), notes: nullable(data.notes),
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
    } });
    await tx.enquiryStatusHistory.create({ data: { enquiryId: created.id, toStatus: "NEW", changedById: actor.id } });
    if (data.followUpAt) await tx.enquiryFollowUp.create({ data: { enquiryId: created.id, scheduledFor: new Date(data.followUpAt), assignedToId: actor.id, createdById: actor.id, notes: "Initial enquiry follow-up" } });
    await writeAuditEvent(tx, { actorId: actor.id, action: "enquiry.created", entityType: "Enquiry", entityId: created.id, next: { reference, customerId, status: created.status } });
    return created;
  });
  redirect(`/enquiries/${enquiry.id}`);
}
