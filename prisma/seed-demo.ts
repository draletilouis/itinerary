import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const json = (value: unknown) => value as Prisma.InputJsonValue;
const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 86_400_000);

async function main() {
  const actor = await prisma.user.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!actor) {
    throw new Error("Create the first administrator before running the demo seed.");
  }

  for (const sequence of [
    ["package", "PKG"],
    ["enquiry", "ENQ"],
    ["customer", "CUS"],
    ["vehicle", "VEH"],
    ["driver", "DRV"],
    ["guide", "GDE"],
  ] as const) {
    await prisma.referenceSequence.upsert({
      where: {
        sequenceName_year: {
          sequenceName: sequence[0],
          year: new Date().getUTCFullYear(),
        },
      },
      update: {},
      create: {
        sequenceName: sequence[0],
        prefix: sequence[1],
        year: new Date().getUTCFullYear(),
      },
    });
  }

  const demoRateDate = new Date("2026-01-01T00:00:00.000Z");
  for (const rate of [
    ["USD", "UGX", "3700"],
    ["UGX", "USD", "0.0002702703"],
    ["USD", "KES", "130"],
    ["KES", "USD", "0.0076923077"],
  ] as const) {
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrencyCode_quoteCurrencyCode_effectiveAt: {
          baseCurrencyCode: rate[0],
          quoteCurrencyCode: rate[1],
          effectiveAt: demoRateDate,
        },
      },
      update: {},
      create: {
        baseCurrencyCode: rate[0],
        quoteCurrencyCode: rate[1],
        rate: new Prisma.Decimal(rate[2]),
        effectiveAt: demoRateDate,
        source: "MANUAL",
        sourceReference: "LOCAL DEMO RATE - REPLACE BEFORE LIVE QUOTING",
      },
    });
  }

  const supplierRows = [
    {
      reference: "DEMO-SUP-001",
      name: "Bwindi Forest Lodge Demo",
      categoryName: "Accommodation",
      contactPerson: "Reservations Team",
      phone: "+256 700 000 101",
      email: "reservations@bwindi-demo.example",
      preferredCurrencyCode: "USD",
      paymentTerms: "30% deposit, balance 30 days before arrival",
      notes: "Demo supplier. Replace rates and contacts before live use.",
    },
    {
      reference: "DEMO-SUP-002",
      name: "Uganda Wildlife Experiences Demo",
      categoryName: "Activities",
      contactPerson: "Permit Desk",
      phone: "+256 700 000 102",
      email: "permits@wildlife-demo.example",
      preferredCurrencyCode: "USD",
      paymentTerms: "Full payment on confirmation",
      notes: "Demo activity supplier.",
    },
    {
      reference: "DEMO-SUP-003",
      name: "Pearl Safari Transport Demo",
      categoryName: "Transport",
      contactPerson: "Fleet Coordinator",
      phone: "+256 700 000 103",
      email: "fleet@pearl-transport-demo.example",
      preferredCurrencyCode: "USD",
      paymentTerms: "Weekly invoicing",
      notes: "Demo transport supplier.",
    },
    {
      reference: "DEMO-SUP-004",
      name: "Nile Adventure Camp Demo",
      categoryName: "Accommodation and activities",
      contactPerson: "Camp Reservations",
      phone: "+256 700 000 104",
      email: "stay@nile-camp-demo.example",
      preferredCurrencyCode: "USD",
      paymentTerms: "50% deposit",
      notes: "Demo Jinja supplier.",
    },
  ];
  const suppliers = new Map<string, Awaited<ReturnType<typeof prisma.supplier.upsert>>>();
  for (const row of supplierRows) {
    const { categoryName, ...supplierData } = row;
    const category = await prisma.supplierCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
    const supplier = await prisma.supplier.upsert({
      where: { reference: row.reference },
      update: { categoryId: category.id },
      create: { ...supplierData, categoryId: category.id },
    });
    suppliers.set(row.reference, supplier);
  }

  const destinationRows = [
    {
      name: "Bwindi Impenetrable National Park",
      country: "Uganda",
      region: "South Western Uganda",
      shortDescription: "Mountain gorilla trekking and forest experiences.",
      bestTravelPeriods: "June to September and December to February",
      typicalStayDays: 3,
      travelAdvice: "Pack sturdy walking shoes and rain protection.",
    },
    {
      name: "Queen Elizabeth National Park",
      country: "Uganda",
      region: "Western Uganda",
      shortDescription: "Game drives, Kazinga Channel cruises and crater landscapes.",
      bestTravelPeriods: "January to February and June to September",
      typicalStayDays: 3,
    },
    {
      name: "Jinja and the River Nile",
      country: "Uganda",
      region: "Eastern Uganda",
      shortDescription: "Nile adventures, boat excursions and cultural experiences.",
      bestTravelPeriods: "All year",
      typicalStayDays: 2,
    },
    {
      name: "Murchison Falls National Park",
      country: "Uganda",
      region: "North Western Uganda",
      shortDescription: "Waterfalls, wildlife drives and Nile boat cruises.",
      bestTravelPeriods: "December to February and June to September",
      typicalStayDays: 3,
    },
  ];
  const destinations = new Map<
    string,
    Awaited<ReturnType<typeof prisma.destination.upsert>>
  >();
  for (const row of destinationRows) {
    const destination = await prisma.destination.upsert({
      where: { name_country: { name: row.name, country: row.country } },
      update: {},
      create: row,
    });
    destinations.set(row.name, destination);
  }

  const bwindi = destinations.get("Bwindi Impenetrable National Park")!;
  const queen = destinations.get("Queen Elizabeth National Park")!;
  const jinja = destinations.get("Jinja and the River Nile")!;
  const murchison = destinations.get("Murchison Falls National Park")!;

  const accommodationRows = [
    {
      name: "Bwindi Forest Lodge Demo",
      destinationId: bwindi.id,
      type: "Safari lodge",
      rating: "Mid-range",
      description: "Forest-edge lodge used for package-building demonstrations.",
      checkInTime: "14:00",
      checkOutTime: "10:00",
      amenities: ["Restaurant", "Wi-Fi", "Laundry", "Forest views"],
      mealPlans: ["Bed and breakfast", "Full board"],
      supplierId: suppliers.get("DEMO-SUP-001")!.id,
    },
    {
      name: "Kazinga Safari Lodge Demo",
      destinationId: queen.id,
      type: "Safari lodge",
      rating: "Comfort",
      description: "Demo lodge near the Queen Elizabeth safari circuit.",
      checkInTime: "14:00",
      checkOutTime: "10:00",
      amenities: ["Restaurant", "Pool", "Wi-Fi"],
      mealPlans: ["Half board", "Full board"],
      supplierId: suppliers.get("DEMO-SUP-001")!.id,
    },
    {
      name: "Nile Adventure Camp Demo",
      destinationId: jinja.id,
      type: "Adventure camp",
      rating: "Comfort",
      description: "Demo riverside accommodation for Jinja packages.",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      amenities: ["River views", "Restaurant", "Activity desk"],
      mealPlans: ["Bed and breakfast", "Full board"],
      supplierId: suppliers.get("DEMO-SUP-004")!.id,
    },
  ];
  const accommodations = new Map<
    string,
    Awaited<ReturnType<typeof prisma.accommodation.upsert>>
  >();
  for (const row of accommodationRows) {
    const accommodation = await prisma.accommodation.upsert({
      where: {
        name_destinationId: {
          name: row.name,
          destinationId: row.destinationId,
        },
      },
      update: {},
      create: row,
    });
    accommodations.set(row.name, accommodation);
    await prisma.roomType.upsert({
      where: {
        accommodationId_name: {
          accommodationId: accommodation.id,
          name: "Standard Twin / Double",
        },
      },
      update: {},
      create: {
        accommodationId: accommodation.id,
        name: "Standard Twin / Double",
        maximumOccupancy: 2,
        adultCapacity: 2,
        childCapacity: 1,
        bedConfiguration: "One double bed or two twin beds",
      },
    });
  }

  const activityRows = [
    {
      name: "Gorilla Trekking Experience Demo",
      destinationId: bwindi.id,
      category: "Wildlife",
      description: "Guided trek to observe a habituated mountain gorilla family.",
      durationMinutes: 360,
      availableStartTimes: ["07:30"],
      ageRestrictions: "Minimum age 15 years",
      capacity: 8,
      supplierId: suppliers.get("DEMO-SUP-002")!.id,
      permitRequirements: "Gorilla permit required",
      safetyNotes: "Follow ranger instructions throughout the trek.",
    },
    {
      name: "Kazinga Channel Boat Safari Demo",
      destinationId: queen.id,
      category: "Boat safari",
      description: "Wildlife viewing cruise along the Kazinga Channel.",
      durationMinutes: 120,
      availableStartTimes: ["11:00", "15:00"],
      capacity: 20,
      supplierId: suppliers.get("DEMO-SUP-002")!.id,
    },
    {
      name: "Queen Elizabeth Game Drive Demo",
      destinationId: queen.id,
      category: "Game drive",
      description: "Guided wildlife drive through the Kasenyi plains.",
      durationMinutes: 240,
      availableStartTimes: ["06:30", "15:30"],
      supplierId: suppliers.get("DEMO-SUP-003")!.id,
    },
    {
      name: "Source of the Nile Boat Experience Demo",
      destinationId: jinja.id,
      category: "Boat excursion",
      description: "Relaxed boat excursion to the Source of the Nile.",
      durationMinutes: 90,
      availableStartTimes: ["09:00", "14:00"],
      supplierId: suppliers.get("DEMO-SUP-004")!.id,
    },
    {
      name: "Murchison Falls Nile Cruise Demo",
      destinationId: murchison.id,
      category: "Boat safari",
      description: "Nile cruise toward the base of Murchison Falls.",
      durationMinutes: 180,
      availableStartTimes: ["09:00", "14:00"],
      supplierId: suppliers.get("DEMO-SUP-002")!.id,
    },
  ];
  const activities = new Map<string, Awaited<ReturnType<typeof prisma.activity.upsert>>>();
  for (const row of activityRows) {
    const activity = await prisma.activity.upsert({
      where: {
        name_destinationId: {
          name: row.name,
          destinationId: row.destinationId,
        },
      },
      update: {},
      create: row,
    });
    activities.set(row.name, activity);
  }

  const customerRows = [
    {
      reference: "DEMO-CUS-001",
      type: "FAMILY" as const,
      fullName: "Sarah and James Miller (Demo)",
      email: "miller.family@example.com",
      phone: "+44 7700 900101",
      country: "United Kingdom",
      nationality: "British",
      preferredCommunicationMethod: "Email",
      travelPreferences: "Wildlife, comfortable lodges and private transport",
      dietaryRequirements: "One vegetarian traveller",
      tags: ["Demo", "Wildlife", "Private"],
      createdById: actor.id,
      notes: "Synthetic demo customer for tour-creation training.",
    },
    {
      reference: "DEMO-CUS-002",
      type: "SCHOOL" as const,
      fullName: "East Africa Learning Academy (Demo)",
      organisation: "East Africa Learning Academy",
      email: "travel@learning-academy.example",
      phone: "+256 700 000 201",
      country: "Uganda",
      preferredCommunicationMethod: "Email",
      travelPreferences: "Educational travel, conservation and cultural learning",
      tags: ["Demo", "School", "Group"],
      createdById: actor.id,
      notes: "Synthetic demo organisation.",
    },
    {
      reference: "DEMO-CUS-003",
      type: "CORPORATE" as const,
      fullName: "Acacia Consulting Group (Demo)",
      organisation: "Acacia Consulting Group",
      email: "events@acacia-consulting.example",
      phone: "+254 700 000 301",
      country: "Kenya",
      preferredCommunicationMethod: "Email",
      travelPreferences: "Team retreats and private group activities",
      tags: ["Demo", "Corporate", "Group"],
      createdById: actor.id,
      notes: "Synthetic demo corporate customer.",
    },
  ];
  const customers = new Map<string, Awaited<ReturnType<typeof prisma.customer.upsert>>>();
  for (const row of customerRows) {
    const customer = await prisma.customer.upsert({
      where: { reference: row.reference },
      update: {},
      create: row,
    });
    customers.set(row.reference, customer);
  }

  const today = new Date();
  const enquiryRows = [
    {
      reference: "DEMO-ENQ-001",
      dateReceived: today,
      customerId: customers.get("DEMO-CUS-001")!.id,
      source: "Website",
      assignedToId: actor.id,
      createdById: actor.id,
      proposedStartDate: addDays(today, 75),
      proposedEndDate: addDays(today, 77),
      adults: 2,
      children: 0,
      childAges: [],
      rooms: 1,
      destinationsOfInterest: ["Bwindi Impenetrable National Park"],
      arrivalLocation: "Entebbe International Airport",
      departureLocation: "Entebbe International Airport",
      customerBudget: new Prisma.Decimal("6500"),
      budgetCurrencyCode: "USD",
      accommodationPreference: "Comfortable mid-range lodge",
      activityInterests: ["Gorilla trekking", "Forest walks"],
      transportPreference: "Private 4x4 vehicle",
      dietaryRequirements: "One vegetarian traveller",
      status: "QUALIFYING" as const,
      notes: "Demo enquiry ready for conversion into a tour.",
    },
    {
      reference: "DEMO-ENQ-002",
      dateReceived: today,
      customerId: customers.get("DEMO-CUS-002")!.id,
      source: "Referral",
      assignedToId: actor.id,
      createdById: actor.id,
      proposedStartDate: addDays(today, 100),
      proposedEndDate: addDays(today, 103),
      flexibleDates: true,
      adults: 4,
      children: 16,
      childAges: [12, 12, 13, 13, 14, 14, 14, 15, 15, 15, 16, 16, 16, 16, 17, 17],
      rooms: 10,
      destinationsOfInterest: ["Queen Elizabeth National Park"],
      arrivalLocation: "Kampala",
      departureLocation: "Kampala",
      customerBudget: new Prisma.Decimal("45000000"),
      budgetCurrencyCode: "UGX",
      accommodationPreference: "Safe group accommodation",
      activityInterests: ["Wildlife", "Conservation education", "Boat safari"],
      transportPreference: "Coach or safari vans",
      status: "NEW" as const,
      notes: "Demo school-group enquiry.",
    },
    {
      reference: "DEMO-ENQ-003",
      dateReceived: today,
      customerId: customers.get("DEMO-CUS-003")!.id,
      source: "Corporate referral",
      assignedToId: actor.id,
      createdById: actor.id,
      proposedStartDate: addDays(today, 45),
      proposedEndDate: addDays(today, 45),
      adults: 12,
      children: 0,
      childAges: [],
      destinationsOfInterest: ["Jinja and the River Nile"],
      arrivalLocation: "Kampala",
      departureLocation: "Kampala",
      customerBudget: new Prisma.Decimal("7800"),
      budgetCurrencyCode: "USD",
      accommodationPreference: "Day trip",
      activityInterests: ["Boat excursion", "Team lunch"],
      transportPreference: "Private coaster",
      status: "CONTACTED" as const,
      notes: "Demo corporate day-trip enquiry.",
    },
  ];
  for (const row of enquiryRows) {
    await prisma.enquiry.upsert({
      where: { reference: row.reference },
      update: {},
      create: row,
    });
  }

  await prisma.vehicle.upsert({
    where: { reference: "DEMO-VEH-001" },
    update: {},
    create: {
      reference: "DEMO-VEH-001",
      registration: "UDE 001D",
      make: "Toyota",
      model: "Land Cruiser",
      vehicleType: "Extended safari 4x4",
      capacity: 7,
      ownership: "Company",
      manufactureYear: 2022,
      colour: "White",
      notes: "Demo vehicle.",
    },
  });
  await prisma.driver.upsert({
    where: { reference: "DEMO-DRV-001" },
    update: {},
    create: {
      reference: "DEMO-DRV-001",
      fullName: "Daniel Okello (Demo)",
      phone: "+256 700 000 401",
      email: "daniel.driver@example.com",
      licenceNumber: "DEMO-DL-001",
      licenceClass: "CM",
      emergencyContact: "+256 700 000 499",
      notes: "Synthetic demo driver.",
    },
  });
  await prisma.guide.upsert({
    where: { reference: "DEMO-GDE-001" },
    update: {},
    create: {
      reference: "DEMO-GDE-001",
      fullName: "Grace Namara (Demo)",
      phone: "+256 700 000 501",
      email: "grace.guide@example.com",
      languages: ["English", "Luganda", "Runyankole"],
      specialities: ["Wildlife", "Birding", "Gorilla trekking"],
      certification: "Demo safari guide certification",
      notes: "Synthetic demo guide.",
    },
  });

  const bwindiPackageDays = [
    {
      dayNumber: 1,
      title: "Arrival and transfer to Bwindi",
      destinationId: bwindi.id,
      startLocation: "Entebbe / Kampala",
      endLocation: "Bwindi",
      clientNarrative:
        "Meet your safari guide and travel through Uganda’s scenic countryside to Bwindi. Settle into the forest lodge and enjoy dinner overlooking the surrounding hills.",
      meals: ["Lunch", "Dinner"],
      transport: "Private safari 4x4",
      items: [
        {
          type: "TRANSPORT",
          title: "Private transfer to Bwindi",
          supplierId: suppliers.get("DEMO-SUP-003")!.id,
          clientDescription: "Scenic private road transfer with planned comfort stops.",
        },
        {
          type: "ACCOMMODATION",
          title: "Overnight at Bwindi Forest Lodge Demo",
          accommodationId: accommodations.get("Bwindi Forest Lodge Demo")!.id,
          supplierId: suppliers.get("DEMO-SUP-001")!.id,
          clientDescription: "Comfortable forest-edge lodge on full board.",
        },
      ],
    },
    {
      dayNumber: 2,
      title: "Mountain gorilla trekking",
      destinationId: bwindi.id,
      startLocation: "Bwindi lodge",
      endLocation: "Bwindi lodge",
      clientNarrative:
        "After an early breakfast, attend the ranger briefing and trek through Bwindi’s rainforest in search of a habituated mountain gorilla family. Return to the lodge for a relaxed evening.",
      meals: ["Breakfast", "Packed lunch", "Dinner"],
      transport: "Safari 4x4 transfer to park headquarters",
      items: [
        {
          type: "ACTIVITY",
          title: "Gorilla trekking experience",
          startTime: "07:30",
          activityId: activities.get("Gorilla Trekking Experience Demo")!.id,
          supplierId: suppliers.get("DEMO-SUP-002")!.id,
          clientDescription: "Guided gorilla trek with Uganda Wildlife Authority rangers.",
        },
        {
          type: "ACCOMMODATION",
          title: "Second night at Bwindi Forest Lodge Demo",
          accommodationId: accommodations.get("Bwindi Forest Lodge Demo")!.id,
          supplierId: suppliers.get("DEMO-SUP-001")!.id,
        },
      ],
    },
    {
      dayNumber: 3,
      title: "Return to Entebbe",
      destinationId: bwindi.id,
      startLocation: "Bwindi",
      endLocation: "Entebbe / Kampala",
      clientNarrative:
        "Enjoy breakfast before the return journey to Kampala or Entebbe, with scenic stops along the way.",
      meals: ["Breakfast", "Lunch"],
      transport: "Private safari 4x4",
      items: [
        {
          type: "TRANSPORT",
          title: "Return transfer to Entebbe",
          supplierId: suppliers.get("DEMO-SUP-003")!.id,
        },
      ],
    },
  ];
  const bwindiPackageCosts = [
    {
      category: "Accommodation",
      description: "Bwindi lodge, one room for two nights",
      basis: "ACCOMMODATION",
      unitCost: "180",
      quantity: "1",
      days: "1",
      nights: "2",
      rooms: "1",
      vehicles: "0",
      eligibleTravellers: "0",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
      supplierId: suppliers.get("DEMO-SUP-001")!.id,
      dayNumber: 1,
    },
    {
      category: "Permits",
      description: "Demo gorilla trekking permits",
      basis: "PER_PERSON",
      unitCost: "800",
      quantity: "1",
      days: "1",
      nights: "0",
      rooms: "0",
      vehicles: "0",
      eligibleTravellers: "2",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
      supplierId: suppliers.get("DEMO-SUP-002")!.id,
      dayNumber: 2,
    },
    {
      category: "Transport",
      description: "Private safari 4x4 with fuel",
      basis: "VEHICLE",
      unitCost: "220",
      quantity: "1",
      days: "3",
      nights: "0",
      rooms: "0",
      vehicles: "1",
      eligibleTravellers: "0",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
      supplierId: suppliers.get("DEMO-SUP-003")!.id,
    },
    {
      category: "Guides",
      description: "Professional safari guide",
      basis: "STANDARD",
      unitCost: "120",
      quantity: "1",
      days: "3",
      nights: "0",
      rooms: "0",
      vehicles: "0",
      eligibleTravellers: "0",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
    },
    {
      category: "Meals",
      description: "Full-tour meal plan per traveller",
      basis: "PER_PERSON",
      unitCost: "105",
      quantity: "1",
      days: "1",
      nights: "0",
      rooms: "0",
      vehicles: "0",
      eligibleTravellers: "2",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
      supplierId: suppliers.get("DEMO-SUP-001")!.id,
    },
  ];
  await prisma.tourPackage.upsert({
    where: { reference: "DEMO-PKG-001" },
    update: {},
    create: {
      reference: "DEMO-PKG-001",
      name: "3-Day Bwindi Gorilla Escape (Demo)",
      description: "Training package with itinerary, accommodation and complete costs.",
      type: "STANDARD_PACKAGE",
      durationDays: 3,
      defaultAdults: 2,
      defaultChildren: 0,
      costingCurrencyCode: "USD",
      quotationCurrencyCode: "USD",
      introduction:
        "A private three-day journey into Bwindi’s rainforest, built as a complete package-creation example.",
      summary: "Three days of private travel and an unforgettable gorilla encounter.",
      inclusions: [
        "Private safari vehicle and fuel",
        "Professional English-speaking guide",
        "Two nights’ accommodation",
        "Meals shown in the itinerary",
        "Demo gorilla trekking permits",
      ],
      exclusions: [
        "International flights",
        "Travel insurance",
        "Tips and personal expenses",
      ],
      importantNotes:
        "All prices and contacts in this demo package are examples. Replace them with current contracted rates before live quoting.",
      terms: "Demo terms: deposit required to confirm; permits are subject to availability.",
      itineraryTemplate: json(bwindiPackageDays),
      costTemplate: json(bwindiPackageCosts),
      defaultContingencyMethod: "NONE",
      defaultContingencyValue: new Prisma.Decimal(0),
      defaultMarkupMethod: "PERCENTAGE",
      defaultMarkupValue: new Prisma.Decimal(20),
      defaultTaxMethod: "NONE",
      defaultTaxValue: new Prisma.Decimal(0),
      defaultDiscountMethod: "NONE",
      defaultDiscountValue: new Prisma.Decimal(0),
      minimumMargin: new Prisma.Decimal(15),
      createdById: actor.id,
    },
  });

  const jinjaPackageDays = [
    {
      dayNumber: 1,
      title: "Jinja and the Source of the Nile",
      destinationId: jinja.id,
      startLocation: "Kampala",
      endLocation: "Kampala",
      clientNarrative:
        "Travel to Jinja for a relaxed boat experience at the Source of the Nile, followed by lunch and time to enjoy the riverside atmosphere before returning to Kampala.",
      meals: ["Lunch"],
      transport: "Private coaster or safari van",
      items: [
        {
          type: "ACTIVITY",
          title: "Source of the Nile boat experience",
          activityId: activities.get("Source of the Nile Boat Experience Demo")!.id,
          supplierId: suppliers.get("DEMO-SUP-004")!.id,
          startTime: "10:30",
        },
        {
          type: "TRANSPORT",
          title: "Return private transport from Kampala",
          supplierId: suppliers.get("DEMO-SUP-003")!.id,
        },
      ],
    },
  ];
  const jinjaPackageCosts = [
    {
      category: "Transport",
      description: "Private group coaster for the day",
      basis: "VEHICLE",
      unitCost: "350",
      quantity: "1",
      days: "1",
      nights: "0",
      rooms: "0",
      vehicles: "1",
      eligibleTravellers: "0",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
      supplierId: suppliers.get("DEMO-SUP-003")!.id,
    },
    {
      category: "Activities",
      description: "Source of the Nile boat experience",
      basis: "PER_PERSON",
      unitCost: "25",
      quantity: "1",
      days: "1",
      nights: "0",
      rooms: "0",
      vehicles: "0",
      eligibleTravellers: "12",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
      supplierId: suppliers.get("DEMO-SUP-004")!.id,
      dayNumber: 1,
    },
    {
      category: "Meals",
      description: "Group lunch",
      basis: "PER_PERSON",
      unitCost: "20",
      quantity: "1",
      days: "1",
      nights: "0",
      rooms: "0",
      vehicles: "0",
      eligibleTravellers: "12",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
      supplierId: suppliers.get("DEMO-SUP-004")!.id,
      dayNumber: 1,
    },
    {
      category: "Guides",
      description: "Tour coordinator for the day",
      basis: "STANDARD",
      unitCost: "100",
      quantity: "1",
      days: "1",
      nights: "0",
      rooms: "0",
      vehicles: "0",
      eligibleTravellers: "0",
      taxPercentage: "0",
      commissionPercentage: "0",
      originalCurrencyCode: "USD",
    },
  ];
  await prisma.tourPackage.upsert({
    where: { reference: "DEMO-PKG-002" },
    update: {},
    create: {
      reference: "DEMO-PKG-002",
      name: "Jinja Corporate Day Experience (Demo)",
      description: "One-day group package demonstrating per-person and vehicle costs.",
      type: "CORPORATE",
      durationDays: 1,
      defaultAdults: 12,
      defaultChildren: 0,
      costingCurrencyCode: "USD",
      quotationCurrencyCode: "USD",
      introduction:
        "A simple corporate day experience combining private transport, a Nile boat excursion and group lunch.",
      summary: "A relaxed team day at the Source of the Nile.",
      inclusions: ["Private group transport", "Boat experience", "Lunch", "Tour coordinator"],
      exclusions: ["Personal purchases", "Optional activities", "Tips"],
      importantNotes:
        "This is demo data. Confirm group capacity and supplier rates before live use.",
      terms: "Demo terms: final guest count required seven days before travel.",
      itineraryTemplate: json(jinjaPackageDays),
      costTemplate: json(jinjaPackageCosts),
      defaultContingencyMethod: "FIXED",
      defaultContingencyValue: new Prisma.Decimal(100),
      defaultMarkupMethod: "TARGET_MARGIN",
      defaultMarkupValue: new Prisma.Decimal(20),
      defaultTaxMethod: "NONE",
      defaultTaxValue: new Prisma.Decimal(0),
      defaultDiscountMethod: "NONE",
      defaultDiscountValue: new Prisma.Decimal(0),
      minimumMargin: new Prisma.Decimal(15),
      createdById: actor.id,
    },
  });

  const existingAudit = await prisma.auditEvent.findFirst({
    where: {
      action: "system.demo-seed.completed",
      entityType: "SeedBatch",
      entityId: "tour-creation-demo-v1",
    },
  });
  if (!existingAudit) {
    await prisma.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "system.demo-seed.completed",
        entityType: "SeedBatch",
        entityId: "tour-creation-demo-v1",
        newValues: json({
          customers: customerRows.map((row) => row.reference),
          enquiries: enquiryRows.map((row) => row.reference),
          packages: ["DEMO-PKG-001", "DEMO-PKG-002"],
          notice: "Synthetic local training data; replace rates before live quoting.",
        }),
      },
    });
  }

  console.log(
    "Tour-creation demo data is ready: 3 customers, 3 enquiries, 4 destinations, 5 activities, 3 accommodations, 4 suppliers, 2 packages, and starter resources.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
