import type { Prisma } from "@prisma/client";
import { writeAuditEvent } from "@/server/audit/service";
import { nextReference } from "@/modules/settings/services/reference-number";

export async function createBookingFromAcceptedQuotation(
  tx: Prisma.TransactionClient,
  input: {
    quotationId: string;
    quotationVersionId: string;
    actorId: string;
  },
) {
  const quotation = await tx.quotation.findUniqueOrThrow({
    where: { id: input.quotationId },
    include: {
      tour: true,
      versions: {
        where: { id: input.quotationVersionId },
        take: 1,
      },
    },
  });
  const version = quotation.versions[0];
  if (!version) {
    throw new Error("Accepted quotation version not found.");
  }
  const existing = await tx.booking.findUnique({
    where: { tourId: quotation.tourId },
  });
  if (existing) {
    if (existing.acceptedQuotationVersionId !== version.id) {
      throw new Error("This tour already has a booking from another quotation.");
    }
    return existing;
  }

  const reference = await nextReference(tx, "booking", "BOOK");
  const booking = await tx.booking.create({
    data: {
      reference,
      tourId: quotation.tourId,
      customerId: quotation.customerId,
      acceptedQuotationVersionId: version.id,
      acceptedItineraryVersionId: version.itineraryVersionId,
      travellerCount: quotation.tour.adults + quotation.tour.children,
      currencyCode: version.currencyCode,
      totalAmount: version.total,
      balanceDue: version.total,
      finalPaymentDate: quotation.tour.startDate,
      status: "PROVISIONAL",
      createdById: input.actorId,
    },
  });
  await tx.bookingPaymentSchedule.create({
    data: {
      bookingId: booking.id,
      sequence: 1,
      label: "Final balance",
      dueDate: quotation.tour.startDate,
      amount: version.total,
    },
  });

  if (quotation.tour.sourceEnquiryId) {
    const enquiry = await tx.enquiry.findUnique({
      where: { id: quotation.tour.sourceEnquiryId },
      select: { status: true },
    });
    if (enquiry && enquiry.status !== "CONFIRMED") {
      await tx.enquiry.update({
        where: { id: quotation.tour.sourceEnquiryId },
        data: { status: "CONFIRMED", followUpAt: null },
      });
      await tx.enquiryStatusHistory.create({
        data: {
          enquiryId: quotation.tour.sourceEnquiryId,
          fromStatus: enquiry.status,
          toStatus: "CONFIRMED",
          reason: `Accepted quotation ${quotation.reference}`,
          changedById: input.actorId,
        },
      });
    }
  }

  if (quotation.tour.status !== "CONFIRMED") {
    await tx.tourStatusHistory.create({
      data: {
        tourId: quotation.tourId,
        fromStatus: quotation.tour.status,
        toStatus: "CONFIRMED",
        reason: `Booking ${reference} created from accepted quotation`,
        changedById: input.actorId,
      },
    });
  }
  await tx.tour.update({
    where: { id: quotation.tourId },
    data: {
      status: "CONFIRMED",
      bookingStatus: "PROVISIONAL",
    },
  });
  await writeAuditEvent(tx, {
    actorId: input.actorId,
    action: "booking.created",
    entityType: "Booking",
    entityId: booking.id,
    next: {
      reference,
      quotationVersionId: version.id,
      itineraryVersionId: version.itineraryVersionId,
      totalAmount: version.total.toString(),
      currencyCode: version.currencyCode,
    },
  });
  return booking;
}
