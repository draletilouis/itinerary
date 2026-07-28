"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";

const tourStatuses = [
  "DRAFT",
  "PLANNING",
  "COSTING",
  "QUOTED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "OPERATIONAL_PREPARATION",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export async function setTourStatusAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = z
    .object({
      tourId: z.string().uuid(),
      status: z.enum(tourStatuses),
      reason: z.string().trim().optional().default(""),
    })
    .parse(Object.fromEntries(formData));

  if (parsed.status === "CANCELLED" && !parsed.reason) {
    throw new Error("Enter a cancellation reason.");
  }

  await prisma.$transaction(async (tx) => {
    const previous = await tx.tour.findUniqueOrThrow({ where: { id: parsed.tourId } });
    if (previous.status === "COMPLETED" && parsed.status !== "ARCHIVED") {
      throw new Error("A completed tour can only be archived.");
    }
    if (previous.status === parsed.status) return;
    await tx.tour.update({
      where: { id: parsed.tourId },
      data: { status: parsed.status },
    });
    await tx.tourStatusHistory.create({
      data: {
        tourId: parsed.tourId,
        fromStatus: previous.status,
        toStatus: parsed.status,
        reason: parsed.reason || null,
        changedById: actor.id,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour.status-changed",
      entityType: "Tour",
      entityId: parsed.tourId,
      previous: { status: previous.status },
      next: { status: parsed.status, reason: parsed.reason || undefined },
    });
  });

  revalidatePath(`/tours/${parsed.tourId}`);
  revalidatePath("/tours");
}
