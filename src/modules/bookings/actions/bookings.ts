"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";
import { buildDepositSchedule } from "../services/schedule";
import { initializeTourOperations } from "@/modules/operations/services/initialize-operations";

const money = z.string().regex(/^\d+(\.\d{1,4})?$/, "Enter a valid amount.");
const optionalMoney = z
  .string()
  .trim()
  .refine((value) => !value || /^\d+(\.\d{1,4})?$/.test(value), "Enter a valid amount.")
  .default("");
const optionalText = z.string().trim().optional().default("");

function parseDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Select a valid ${label.toLowerCase()}.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Select a valid ${label.toLowerCase()}.`);
  }
  return date;
}

export async function updateBookingScheduleAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      bookingId: z.string().uuid(),
      depositAmount: money,
      depositDueDate: optionalText,
      instalment1Amount: optionalMoney,
      instalment1DueDate: optionalText,
      instalment2Amount: optionalMoney,
      instalment2DueDate: optionalText,
      finalPaymentDate: z.string().min(1),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: data.bookingId },
      include: { paymentSchedule: true },
    });
    if (!["PROVISIONAL", "AWAITING_DEPOSIT"].includes(booking.status)) {
      throw new Error("Only provisional bookings can have their payment schedule changed.");
    }
    if (
      booking.amountPaid.isPositive() ||
      booking.paymentSchedule.some((entry) => entry.amountPaid.isPositive())
    ) {
      throw new Error("A payment schedule with recorded payments cannot be replaced.");
    }

    const depositAmount = new Prisma.Decimal(data.depositAmount);
    const instalments = [
      {
        label: "Second instalment",
        amount: data.instalment1Amount,
        dueDate: data.instalment1DueDate,
      },
      {
        label: "Third instalment",
        amount: data.instalment2Amount,
        dueDate: data.instalment2DueDate,
      },
    ]
      .filter((entry) => entry.amount)
      .map((entry) => {
        if (!entry.dueDate) {
          throw new Error(`Select a due date for ${entry.label.toLowerCase()}.`);
        }
        return {
          label: entry.label,
          amount: entry.amount,
          dueDate: parseDate(entry.dueDate, `${entry.label} due date`),
        };
      });
    const finalPaymentDate = parseDate(data.finalPaymentDate, "Final payment date");
    const schedule = buildDepositSchedule({
      totalAmount: booking.totalAmount,
      depositAmount,
      depositDueDate: data.depositDueDate
        ? parseDate(data.depositDueDate, "Deposit due date")
        : null,
      instalments,
      finalPaymentDate,
    });

    await tx.bookingPaymentSchedule.deleteMany({ where: { bookingId: booking.id } });
    for (const entry of schedule) {
      await tx.bookingPaymentSchedule.create({
        data: {
          bookingId: booking.id,
          sequence: entry.sequence,
          label: entry.label,
          dueDate: entry.dueDate,
          amount: entry.amount,
        },
      });
    }
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        depositAmount,
        finalPaymentDate,
        status: depositAmount.isPositive() ? "AWAITING_DEPOSIT" : "PROVISIONAL",
      },
    });
    await tx.tour.update({
      where: { id: booking.tourId },
      data: {
        bookingStatus: depositAmount.isPositive() ? "AWAITING_DEPOSIT" : "PROVISIONAL",
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "booking.payment-schedule-updated",
      entityType: "Booking",
      entityId: booking.id,
      previous: {
        depositAmount: booking.depositAmount.toString(),
        milestones: booking.paymentSchedule.length,
      },
      next: {
        depositAmount: depositAmount.toString(),
        milestones: schedule.map((entry) => ({
          label: entry.label,
          dueDate: entry.dueDate.toISOString().slice(0, 10),
          amount: entry.amount.toString(),
        })),
      },
    });
  });
  revalidatePath(`/bookings/${data.bookingId}`);
}

export async function assignBookingTravellerAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      bookingId: z.string().uuid(),
      travellerId: z.string().uuid(),
      isLead: z.string().optional(),
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: data.bookingId },
      select: {
        id: true,
        tourId: true,
        customerId: true,
        status: true,
      },
    });
    if (["COMPLETED", "CANCELLED", "REFUNDED"].includes(booking.status)) {
      throw new Error("Travellers cannot be changed on a closed booking.");
    }
    const traveller = await tx.traveller.findUniqueOrThrow({
      where: { id: data.travellerId },
    });
    if (traveller.customerId !== booking.customerId) {
      throw new Error("Traveller must belong to the booking customer.");
    }
    const existingLink = await tx.tourTraveller.findUnique({
      where: {
        bookingId_travellerId: {
          bookingId: booking.id,
          travellerId: traveller.id,
        },
      },
    });
    if (!existingLink) {
      const assignedCount = await tx.tourTraveller.count({
        where: { bookingId: booking.id },
      });
      const capacity = await tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        select: { travellerCount: true },
      });
      if (assignedCount >= capacity.travellerCount) {
        throw new Error("All planned traveller places are already assigned.");
      }
    }
    const isLead = data.isLead === "on";
    if (isLead) {
      await tx.tourTraveller.updateMany({
        where: { bookingId: booking.id, isLead: true },
        data: { isLead: false },
      });
    }
    const link = await tx.tourTraveller.upsert({
      where: {
        bookingId_travellerId: {
          bookingId: booking.id,
          travellerId: traveller.id,
        },
      },
      update: { isLead, notes: data.notes || null },
      create: {
        bookingId: booking.id,
        tourId: booking.tourId,
        travellerId: traveller.id,
        isLead,
        notes: data.notes || null,
      },
    });
    if (isLead) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { leadTravellerId: traveller.id },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "booking.traveller-assigned",
      entityType: "TourTraveller",
      entityId: link.id,
      next: {
        bookingId: booking.id,
        travellerId: traveller.id,
        isLead,
      },
    });
  });
  revalidatePath(`/bookings/${data.bookingId}`);
}

export async function removeBookingTravellerAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      bookingId: z.string().uuid(),
      linkId: z.string().uuid(),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const link = await tx.tourTraveller.findUniqueOrThrow({
      where: { id: data.linkId },
      include: { booking: { select: { status: true } } },
    });
    if (link.bookingId !== data.bookingId) {
      throw new Error("Traveller assignment does not belong to this booking.");
    }
    if (["COMPLETED", "CANCELLED", "REFUNDED"].includes(link.booking.status)) {
      throw new Error("Travellers cannot be changed on a closed booking.");
    }
    await tx.tourTraveller.delete({ where: { id: link.id } });
    if (link.isLead) {
      await tx.booking.update({
        where: { id: data.bookingId },
        data: { leadTravellerId: null },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "booking.traveller-removed",
      entityType: "TourTraveller",
      entityId: link.id,
      previous: {
        bookingId: link.bookingId,
        travellerId: link.travellerId,
        isLead: link.isLead,
      },
    });
  });
  revalidatePath(`/bookings/${data.bookingId}`);
}

export async function confirmBookingAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const bookingId = z.string().uuid().parse(formData.get("bookingId"));
  const preparation = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (!["PROVISIONAL", "AWAITING_DEPOSIT"].includes(booking.status)) {
      throw new Error("Only a provisional booking can be confirmed.");
    }
    if (booking.amountPaid.lessThan(booking.depositAmount)) {
      throw new Error("The required deposit must be recorded before confirmation.");
    }
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    await tx.tour.update({
      where: { id: booking.tourId },
      data: { bookingStatus: "CONFIRMED", status: "CONFIRMED" },
    });
    const initialized = await initializeTourOperations(tx, {
      tourId: booking.tourId,
      actorId: actor.id,
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "booking.confirmed",
      entityType: "Booking",
      entityId: booking.id,
      next: { status: "CONFIRMED", ...initialized },
    });
    return { tourId: booking.tourId, ...initialized };
  });
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/tours/${preparation.tourId}`);
  revalidatePath("/operations");
  redirect(`/operations?tour=${preparation.tourId}&prepared=1&tasks=${preparation.tasksCreated}&suppliers=${preparation.supplierConfirmationsCreated}#tour-${preparation.tourId}`);
}

export async function cancelBookingAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      bookingId: z.string().uuid(),
      reason: z.string().trim().min(3, "Enter a cancellation reason."),
    })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: data.bookingId },
      include: { tour: { select: { status: true } } },
    });
    if (["COMPLETED", "CANCELLED", "REFUNDED"].includes(booking.status)) {
      throw new Error("This booking can no longer be cancelled.");
    }
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancellationReason: data.reason,
        cancelledAt: new Date(),
      },
    });
    await tx.bookingPaymentSchedule.updateMany({
      where: { bookingId: booking.id, status: { not: "PAID" } },
      data: { status: "CANCELLED" },
    });
    await tx.tour.update({
      where: { id: booking.tourId },
      data: { bookingStatus: "CANCELLED", status: "CANCELLED" },
    });
    if (booking.tour.status !== "CANCELLED") {
      await tx.tourStatusHistory.create({
        data: {
          tourId: booking.tourId,
          fromStatus: booking.tour.status,
          toStatus: "CANCELLED",
          reason: data.reason,
          changedById: actor.id,
        },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "booking.cancelled",
      entityType: "Booking",
      entityId: booking.id,
      previous: { status: booking.status },
      next: {
        status: "CANCELLED",
        reason: data.reason,
        amountPaid: booking.amountPaid.toString(),
      },
    });
  });
  revalidatePath(`/bookings/${data.bookingId}`);
}
