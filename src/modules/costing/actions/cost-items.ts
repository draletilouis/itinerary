"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { prisma } from "@/server/db/prisma";

export async function archiveTourCostItemAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      tourId: z.string().uuid(),
      costItemId: z.string().uuid(),
      reason: z.string().trim().min(3),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const item = await tx.tourCostItem.findUniqueOrThrow({ where: { id: data.costItemId } });
    if (item.tourId !== data.tourId) throw new Error("Cost item does not belong to this tour.");
    if (item.archivedAt) throw new Error("Cost item has already been removed.");
    await tx.tourCostItem.update({
      where: { id: item.id },
      data: { archivedAt: new Date() },
    });
    const remaining = await tx.tourCostItem.aggregate({
      where: { tourId: data.tourId, archivedAt: null, isEstimate: true },
      _sum: { convertedTotal: true },
    });
    await tx.tour.update({
      where: { id: data.tourId },
      data: { estimatedInternalCost: remaining._sum.convertedTotal ?? 0, status: "COSTING" },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "tour.cost-item-removed",
      entityType: "TourCostItem",
      entityId: item.id,
      previous: {
        description: item.description,
        convertedTotal: item.convertedTotal.toString(),
      },
      next: { reason: data.reason },
    });
  });
  revalidatePath(`/tours/${data.tourId}/costing`);
  revalidatePath(`/tours/${data.tourId}`);
}
