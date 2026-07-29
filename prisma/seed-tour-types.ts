import { PrismaClient, TourType } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

const prisma = new PrismaClient();
const types = Object.values(TourType);
const labels: Record<TourType, string> = {
  CUSTOM: "Custom Tailor-Made Safari",
  STANDARD_PACKAGE: "Classic Uganda Standard Package",
  GROUP_DEPARTURE: "Scheduled Group Departure",
  PRIVATE: "Private Family Safari",
  CORPORATE: "Corporate Team Experience",
  SCHOOL: "School Educational Tour",
  DAY: "Kampala Day Experience",
  MULTI_DAY: "Grand Uganda Multi-Day Journey",
};

async function main() {
  const actor = await prisma.user.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  const customer = await prisma.customer.findFirst({ orderBy: { createdAt: "asc" } });
  const enquiry = await prisma.enquiry.findFirst({ orderBy: { createdAt: "asc" } });
  const destination = await prisma.destination.findFirst({ orderBy: { name: "asc" } });
  if (!actor || !customer || !destination) {
    throw new Error("Run the core and demo seeds before the tour-type seed.");
  }

  const suppliers = await prisma.supplier.findMany({
    include: { category: true },
    orderBy: { reference: "asc" },
  });
  for (const supplier of suppliers) {
    const service =
      supplier.category.name === "Accommodation"
        ? "Bed and breakfast accommodation"
        : supplier.category.name === "Transport"
          ? "Private vehicle hire"
          : supplier.category.name === "Activities"
            ? "Guided activity"
            : "Combined tourism service";
    const unit =
      supplier.category.name === "Accommodation"
        ? "per room per night"
        : supplier.category.name === "Transport"
          ? "per vehicle per day"
          : "per person";
    const startDate = new Date("2026-01-01");
    const existingRate = await prisma.supplierRate.findFirst({
      where: { supplierId: supplier.id, service, startDate },
    });
    if (!existingRate) {
      await prisma.supplierRate.create({
        data: {
          supplierId: supplier.id,
          service,
          unit,
          amount: supplier.category.name === "Accommodation" ? 180 : 120,
          currencyCode: "USD",
          startDate,
          notes: "Demo training rate. Replace with the supplier's contracted rate.",
        },
      });
    }
  }
  for (const [index, type] of types.entries()) {
    const number = String(index + 1).padStart(3, "0");
    const durationDays = type === "DAY" ? 1 : type === "MULTI_DAY" ? 7 : 3;
    const packageRecord = await prisma.tourPackage.upsert({
      where: { reference: `DEMO-TYPE-PKG-${number}` },
      update: {},
      create: {
        reference: `DEMO-TYPE-PKG-${number}`,
        name: `${labels[type]} (Demo)`,
        description: `Training catalogue example for the ${type} tour type.`,
        type,
        durationDays,
        defaultAdults: type === "SCHOOL" ? 30 : type === "GROUP_DEPARTURE" ? 12 : 2,
        costingCurrencyCode: "USD",
        quotationCurrencyCode: "USD",
        introduction: `A reusable ${labels[type].toLowerCase()} package.`,
        summary: "Use this example to learn the full package-to-tour workflow.",
        inclusions: ["Transport", "Guide services", "Listed activities"],
        exclusions: ["International flights", "Travel insurance", "Personal expenses"],
        importantNotes: "Demo content and rates must be reviewed before customer use.",
        terms: "Subject to availability and final supplier confirmation.",
        itineraryTemplate: [
          {
            dayNumber: 1,
            title: labels[type],
            destinationId: destination.id,
            startLocation: "Kampala",
            endLocation: destination.name,
            clientNarrative: "Welcome, briefing, transfer and the first planned experience.",
            meals: ["Lunch"],
            transport: "Private road transfer",
            items: [],
          },
        ],
        costTemplate: [],
        createdById: actor.id,
      },
    });

    const startDate = new Date(Date.UTC(2027, index, 10));
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + durationDays - 1);
    const tour = await prisma.tour.upsert({
      where: { reference: `DEMO-TYPE-TOUR-${number}` },
      update: {},
      create: {
        reference: `DEMO-TYPE-TOUR-${number}`,
        name: `${labels[type]} (Demo Tour)`,
        customerId: customer.id,
        sourceEnquiryId: enquiry?.id,
        sourcePackageId: packageRecord.id,
        sourcePackageRevision: packageRecord.revision,
        type,
        startDate,
        endDate,
        adults: packageRecord.defaultAdults,
        children: packageRecord.defaultChildren,
        ownerId: actor.id,
        costingCurrencyCode: "USD",
        quotationCurrencyCode: "USD",
        status: index < 2 ? "PLANNING" : "DRAFT",
        notes: "Seeded training tour. Replace demo assumptions before live use.",
        tags: ["demo", "training", type.toLowerCase()],
      },
    });

    const itinerary = await prisma.itinerary.upsert({
      where: { reference: `DEMO-TYPE-ITI-${number}` },
      update: {},
      create: {
        reference: `DEMO-TYPE-ITI-${number}`,
        title: `${labels[type]} Itinerary`,
        tourId: tour.id,
        enquiryId: enquiry?.id,
        startDate,
        endDate,
        createdById: actor.id,
      },
    });
    await prisma.itineraryVersion.upsert({
      where: {
        itineraryId_versionNumber: {
          itineraryId: itinerary.id,
          versionNumber: 1,
        },
      },
      update: {},
      create: {
        itineraryId: itinerary.id,
        versionNumber: 1,
        title: `${labels[type]} Itinerary`,
        introduction: "A complete starting point that can be edited and priced.",
        summary: "Demo itinerary generated from the matching catalogue package.",
        inclusions: packageRecord.inclusions,
        exclusions: packageRecord.exclusions,
        importantNotes: packageRecord.importantNotes,
        terms: packageRecord.terms,
        createdById: actor.id,
        days: {
          create: {
            dayNumber: 1,
            date: startDate,
            title: `Day 1 - ${destination.name}`,
            startLocation: "Kampala",
            endLocation: destination.name,
            destinationId: destination.id,
            clientNarrative: "Arrival, welcome briefing and transfer to the destination.",
            meals: ["Lunch"],
            transport: "Private road transfer",
          },
        },
      },
    });
  }

  console.log(`Seeded ${types.length} catalogue packages, tours and itineraries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
