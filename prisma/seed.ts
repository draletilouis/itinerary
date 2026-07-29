import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

const prisma = new PrismaClient();

const currencies = [
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", decimalPlaces: 0 },
  { code: "USD", name: "United States Dollar", symbol: "$", decimalPlaces: 2 },
  { code: "EUR", name: "Euro", symbol: "\u20AC", decimalPlaces: 2 },
  { code: "GBP", name: "British Pound", symbol: "\u00A3", decimalPlaces: 2 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", decimalPlaces: 2 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", decimalPlaces: 0 },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", decimalPlaces: 0 },
];

async function main() {
  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: currency,
      create: currency,
    });
  }

  await prisma.companyProfile.upsert({
    where: { singletonKey: "primary" },
    update: {},
    create: {
      singletonKey: "primary",
      name: "Hineni Tours",
      email: "operations@hineni.tours",
      reportingCurrencyCode: "UGX",
    },
  });

  for (const sequence of [
    ["enquiry", "ENQ"],
    ["tour", "TOUR"],
    ["quotation", "QUO"],
    ["booking", "BOOK"],
    ["invoice", "INV"],
    ["receipt", "REC"],
    ["refund", "REF"],
    ["supplier_bill", "BILL"],
    ["supplier_payment", "SPAY"],
    ["expense", "EXP"],
    ["vehicle", "VEH"],
    ["driver", "DRV"],
    ["guide", "GDE"],
    ["equipment", "EQP"],
    ["incident", "INC"],
    ["operation_document", "OPS"],
  ] as const) {
    await prisma.referenceSequence.upsert({
      where: {
        sequenceName_year: {
          sequenceName: sequence[0],
          year: new Date().getUTCFullYear(),
        },
      },
      update: { prefix: sequence[1] },
      create: {
        sequenceName: sequence[0],
        prefix: sequence[1],
        year: new Date().getUTCFullYear(),
      },
    });
  }

  const bootstrapEmail = process.env.BOOTSTRAP_USER_EMAIL?.trim().toLowerCase();
  const bootstrapPassword = process.env.BOOTSTRAP_USER_PASSWORD;
  if (bootstrapEmail && bootstrapPassword) {
    const passwordHash = await hashPassword(bootstrapPassword);
    await prisma.user.upsert({
      where: { email: bootstrapEmail },
      update: {
        fullName: process.env.BOOTSTRAP_USER_NAME?.trim() || "Hineni Administrator",
        status: "ACTIVE",
      },
      create: {
        fullName: process.env.BOOTSTRAP_USER_NAME?.trim() || "Hineni Administrator",
        email: bootstrapEmail,
        passwordHash,
        mustChangePassword: true,
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
