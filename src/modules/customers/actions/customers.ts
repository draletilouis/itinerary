"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";
import { customerSchema, travellerSchema } from "../schemas/customer";

const nullable = (value: string) => value || null;

export async function createCustomerAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid customer details.");
  }

  const customer = await prisma.$transaction(async (tx) => {
    const reference = await nextReference(tx, "customer", "CUS");
    const created = await tx.customer.create({
      data: {
        reference,
        type: parsed.data.type,
        fullName: parsed.data.fullName,
        organisation: nullable(parsed.data.organisation),
        email: nullable(parsed.data.email),
        phone: parsed.data.phone,
        alternativePhone: nullable(parsed.data.alternativePhone),
        country: nullable(parsed.data.country),
        nationality: nullable(parsed.data.nationality),
        address: nullable(parsed.data.address),
        preferredCommunicationMethod: nullable(
          parsed.data.preferredCommunicationMethod,
        ),
        travelPreferences: nullable(parsed.data.travelPreferences),
        dietaryRequirements: nullable(parsed.data.dietaryRequirements),
        accessibilityRequirements: nullable(parsed.data.accessibilityRequirements),
        specialRequests: nullable(parsed.data.specialRequests),
        emergencyContact: nullable(parsed.data.emergencyContact),
        notes: nullable(parsed.data.notes),
        tags: parsed.data.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        createdById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "customer.created",
      entityType: "Customer",
      entityId: created.id,
      next: {
        reference: created.reference,
        fullName: created.fullName,
        type: created.type,
      },
    });
    return created;
  });

  redirect(`/customers/${customer.id}`);
}

export async function addTravellerAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = travellerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid traveller details.");
  }

  const traveller = await prisma.$transaction(async (tx) => {
    const created = await tx.traveller.create({
      data: {
        customerId: parsed.data.customerId,
        fullName: parsed.data.fullName,
        dateOfBirth: parsed.data.dateOfBirth
          ? new Date(parsed.data.dateOfBirth)
          : null,
        nationality: nullable(parsed.data.nationality),
        passportNumber: nullable(parsed.data.passportNumber),
        passportExpiry: parsed.data.passportExpiry
          ? new Date(parsed.data.passportExpiry)
          : null,
        visaStatus: nullable(parsed.data.visaStatus),
        dietaryNeeds: nullable(parsed.data.dietaryNeeds),
        accessibilityNote: nullable(parsed.data.accessibilityNote),
        roomPreference: nullable(parsed.data.roomPreference),
        emergencyContact: nullable(parsed.data.emergencyContact),
        relationship: nullable(parsed.data.relationship),
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "traveller.created",
      entityType: "Traveller",
      entityId: created.id,
      next: { customerId: created.customerId, fullName: created.fullName },
    });
    return created;
  });

  revalidatePath(`/customers/${traveller.customerId}`);
}
