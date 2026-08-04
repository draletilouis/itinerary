import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { createBookingFromAcceptedQuotation } from "../src/modules/bookings/services/create-booking";
import { initializeTourOperations } from "../src/modules/operations/services/initialize-operations";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
  process.env.DIRECT_URL = process.env.DATABASE_PUBLIC_URL;
}

const prisma = new PrismaClient();

async function main() {
  const actor = await prisma.user.findFirstOrThrow({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { reference: "DEMO-QUO-003" },
    include: { versions: { where: { versionNumber: 1 } } },
  });
  const version = quotation.versions[0];
  if (!version) throw new Error("Accepted demo quotation version is missing.");

  let booking = await prisma.booking.findUnique({ where: { tourId: quotation.tourId } });
  if (!booking) {
    booking = await prisma.$transaction(
      (tx) => createBookingFromAcceptedQuotation(tx, {
        quotationId: quotation.id,
        quotationVersionId: version.id,
        actorId: actor.id,
      }),
      { timeout: 60_000 },
    );
  }

  const deposit = new Prisma.Decimal(version.total).mul(0.3);
  const balance = new Prisma.Decimal(version.total).sub(deposit);
  await prisma.booking.update({
    where: { id: booking.id },
    data: { depositAmount: deposit, amountPaid: deposit, balanceDue: balance, status: "CONFIRMED", confirmedAt: new Date() },
  });
  await prisma.tour.update({
    where: { id: quotation.tourId },
    data: { status: "CONFIRMED", bookingStatus: "CONFIRMED", paymentStatus: "PARTIALLY_PAID", actualRevenue: deposit },
  });
  await prisma.$transaction(
    (tx) => initializeTourOperations(tx, { tourId: quotation.tourId, actorId: actor.id }),
    { timeout: 60_000 },
  );

  console.log(JSON.stringify({
    destinations: await prisma.destination.count(),
    packages: await prisma.tourPackage.count(),
    customers: await prisma.customer.count(),
    enquiries: await prisma.enquiry.count(),
    tours: await prisma.tour.count(),
    quotations: await prisma.quotation.count(),
    bookings: await prisma.booking.count(),
    operationalTasks: await prisma.operationalTask.count(),
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
