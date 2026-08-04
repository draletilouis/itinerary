import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { createBookingFromAcceptedQuotation } from "../src/modules/bookings/services/create-booking";
import { initializeTourOperations } from "../src/modules/operations/services/initialize-operations";

const prisma = new PrismaClient();
const d = (value: string | number) => new Prisma.Decimal(value);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

async function main() {
  const actor = await prisma.user.findFirstOrThrow({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
  const destinations = await prisma.destination.findMany({ orderBy: { name: "asc" } });
  const keepNames = ["Bwindi Impenetrable National Park", "Jinja and the River Nile", "Queen Elizabeth National Park"];
  await prisma.destination.deleteMany({ where: { name: { notIn: keepNames } } });
  const kept = new Map((await prisma.destination.findMany()).map((item) => [item.name, item]));
  if (kept.size !== 3) throw new Error("Expected exactly three demo destinations.");

  const suppliers = await prisma.supplier.findMany({ orderBy: { reference: "asc" } });
  const customers = await prisma.customer.findMany({ orderBy: { reference: "asc" } });
  const enquiries = await prisma.enquiry.findMany({ orderBy: { reference: "asc" } });
  if (suppliers.length < 3 || customers.length < 3 || enquiries.length < 3) throw new Error("Run core and demo seeds first.");

  const queen = kept.get("Queen Elizabeth National Park")!;
  await prisma.tourPackage.create({
    data: {
      reference: "DEMO-PKG-003", name: "4-Day Queen Elizabeth Wildlife Safari (Demo)",
      description: "A realistic private safari combining game drives and the Kazinga Channel.", type: "PRIVATE", durationDays: 4,
      defaultAdults: 2, defaultChildren: 1, costingCurrencyCode: "USD", quotationCurrencyCode: "USD",
      introduction: "A private wildlife journey through Uganda's celebrated Queen Elizabeth National Park.",
      summary: "Game drives, a Kazinga Channel boat safari and comfortable lodge stays.",
      inclusions: ["Private safari vehicle", "Professional guide", "Three nights accommodation", "Meals listed", "Park and boat fees"],
      exclusions: ["International flights", "Travel insurance", "Tips and personal expenses"],
      importantNotes: "Synthetic training rates; reconfirm suppliers before live use.", terms: "30% deposit confirms the booking; balance due 30 days before travel.",
      itineraryTemplate: [{ dayNumber: 1, title: "Kampala to Queen Elizabeth", destinationId: queen.id, startLocation: "Kampala", endLocation: "Queen Elizabeth National Park", clientNarrative: "Private transfer west with a scenic lunch stop.", meals: ["Lunch", "Dinner"], transport: "Private safari 4x4", items: [] }, { dayNumber: 2, title: "Game drive and Kazinga Channel", destinationId: queen.id, startLocation: "Safari lodge", endLocation: "Safari lodge", clientNarrative: "Morning wildlife drive followed by an afternoon boat safari.", meals: ["Breakfast", "Lunch", "Dinner"], transport: "Private safari 4x4", items: [] }, { dayNumber: 3, title: "Ishasha exploration", destinationId: queen.id, startLocation: "Safari lodge", endLocation: "Safari lodge", clientNarrative: "Explore the southern sector in search of tree-climbing lions.", meals: ["Breakfast", "Lunch", "Dinner"], transport: "Private safari 4x4", items: [] }, { dayNumber: 4, title: "Return to Kampala", destinationId: queen.id, startLocation: "Queen Elizabeth National Park", endLocation: "Kampala", clientNarrative: "Relaxed return transfer after breakfast.", meals: ["Breakfast", "Lunch"], transport: "Private safari 4x4", items: [] }],
      costTemplate: [{ category: "Accommodation", description: "Three lodge nights", basis: "PER_PERSON_PER_NIGHT", unitCost: "145", quantity: "1", days: "1", nights: "3", rooms: "0", vehicles: "0", eligibleTravellers: "3", taxPercentage: "0", commissionPercentage: "0", originalCurrencyCode: "USD", supplierId: suppliers[0].id }, { category: "Transport", description: "Private safari vehicle and fuel", basis: "VEHICLE", unitCost: "210", quantity: "1", days: "4", nights: "0", rooms: "0", vehicles: "1", eligibleTravellers: "0", taxPercentage: "0", commissionPercentage: "0", originalCurrencyCode: "USD", supplierId: suppliers[2].id }, { category: "Activities", description: "Park entry, game drives and boat safari", basis: "PER_PERSON", unitCost: "190", quantity: "1", days: "1", nights: "0", rooms: "0", vehicles: "0", eligibleTravellers: "3", taxPercentage: "0", commissionPercentage: "0", originalCurrencyCode: "USD", supplierId: suppliers[1].id }],
      defaultMarkupMethod: "TARGET_MARGIN", defaultMarkupValue: d(22), minimumMargin: d(18), createdById: actor.id,
    },
  });

  const packages = await prisma.tourPackage.findMany({ orderBy: { reference: "asc" } });
  if (packages.length !== 3) throw new Error(`Expected 3 packages, found ${packages.length}.`);
  const now = new Date();
  const stages = ["PLANNING", "SENT", "OPERATIONS"] as const;
  for (let index = 0; index < packages.length; index++) {
    const pkg = packages[index]; const customer = customers[index]; const enquiry = enquiries[index];
    const startDate = addDays(now, 45 + index * 30); const endDate = addDays(startDate, pkg.durationDays - 1);
    const tour = await prisma.tour.create({ data: { reference: `DEMO-TOUR-00${index + 1}`, name: pkg.name.replace(" (Demo)", ""), customerId: customer.id, sourceEnquiryId: enquiry.id, sourcePackageId: pkg.id, sourcePackageRevision: pkg.revision, type: pkg.type, startDate, endDate, adults: pkg.defaultAdults, children: pkg.defaultChildren, ownerId: actor.id, costingCurrencyCode: "USD", quotationCurrencyCode: "USD", status: stages[index] === "PLANNING" ? "PLANNING" : "QUOTED", tags: ["demo", "simulation", stages[index].toLowerCase()] } });
    const itinerary = await prisma.itinerary.create({ data: { reference: `DEMO-ITI-00${index + 1}`, title: tour.name, tourId: tour.id, enquiryId: enquiry.id, startDate, endDate, status: "PUBLISHED", currentVersionNumber: 1, createdById: actor.id } });
    const template = pkg.itineraryTemplate as Array<{ dayNumber: number; title: string; destinationId?: string; startLocation?: string; endLocation?: string; clientNarrative?: string; meals?: string[]; transport?: string }>;
    const version = await prisma.itineraryVersion.create({ data: { itineraryId: itinerary.id, versionNumber: 1, title: tour.name, introduction: pkg.introduction, summary: pkg.summary, inclusions: pkg.inclusions, exclusions: pkg.exclusions, importantNotes: pkg.importantNotes, terms: pkg.terms, status: "PUBLISHED", publishedAt: now, createdById: actor.id, days: { create: template.map((day) => ({ dayNumber: day.dayNumber, date: addDays(startDate, day.dayNumber - 1), title: day.title, destinationId: day.destinationId, startLocation: day.startLocation, endLocation: day.endLocation, clientNarrative: day.clientNarrative, meals: day.meals ?? [], transport: day.transport })) } } });
    const baseCost = [3100, 980, 2740][index]; const selling = [3875, 1350, 3515][index]; const profit = selling - baseCost; const margin = profit / selling * 100;
    const pricing = await prisma.tourPricing.create({ data: { tourId: tour.id, revision: 1, currencyCode: "USD", internalCost: d(baseCost), costingToQuotationRate: d(1), contingency: d(0), costAfterContingency: d(baseCost), markupMethod: "TARGET_MARGIN", markupValue: d(margin), markupAmount: d(profit), markupPercentage: d(profit / baseCost * 100), tax: d(0), discount: d(0), sellingPrice: d(selling), estimatedProfit: d(profit), estimatedMargin: d(margin), pricePerTraveller: d(selling / (tour.adults + tour.children)), minimumMargin: d(15), createdById: actor.id } });
    await prisma.tour.update({ where: { id: tour.id }, data: { estimatedInternalCost: d(baseCost), sellingPrice: d(selling), estimatedProfit: d(profit), estimatedMargin: d(margin) } });
    if (stages[index] === "PLANNING") continue;
    const status = stages[index] === "SENT" ? "SENT" : "ACCEPTED";
    const quotation = await prisma.quotation.create({ data: { reference: `DEMO-QUO-00${index + 1}`, tourId: tour.id, customerId: customer.id, currentVersionNumber: 1, status, createdById: actor.id } });
    const qv = await prisma.quotationVersion.create({ data: { quotationId: quotation.id, versionNumber: 1, itineraryVersionId: version.id, pricingId: pricing.id, title: tour.name, issueDate: now, validUntil: addDays(now, 21), currencyCode: "USD", subtotal: d(selling), tax: d(0), discount: d(0), total: d(selling), internalCost: d(baseCost), estimatedProfit: d(profit), estimatedMargin: d(margin), status, sentAt: now, acceptedAt: status === "ACCEPTED" ? now : null, presentationMode: "BOTH", terms: pkg.terms, createdById: actor.id, lines: { create: [{ sortOrder: 1, description: `${pkg.durationDays}-day package for ${tour.adults + tour.children} traveller(s)`, quantity: d(1), unitPrice: d(selling), total: d(selling) }] } } });
    if (status === "ACCEPTED") {
      const booking = await prisma.$transaction((tx) => createBookingFromAcceptedQuotation(tx, { quotationId: quotation.id, quotationVersionId: qv.id, actorId: actor.id }));
      await prisma.booking.update({ where: { id: booking.id }, data: { depositAmount: d(selling * 0.3), amountPaid: d(selling * 0.3), balanceDue: d(selling * 0.7), status: "CONFIRMED", confirmedAt: now } });
      await prisma.tour.update({ where: { id: tour.id }, data: { status: "CONFIRMED", bookingStatus: "CONFIRMED", paymentStatus: "PARTIALLY_PAID", actualRevenue: d(selling * 0.3) } });
      await prisma.$transaction((tx) => initializeTourOperations(tx, { tourId: tour.id, actorId: actor.id }));
    }
  }
  const counts = { destinations: await prisma.destination.count(), packages: await prisma.tourPackage.count(), customers: await prisma.customer.count(), enquiries: await prisma.enquiry.count(), tours: await prisma.tour.count(), quotations: await prisma.quotation.count(), bookings: await prisma.booking.count(), operationalTasks: await prisma.operationalTask.count() };
  console.log(JSON.stringify(counts));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
