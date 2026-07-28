"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";

const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is required."),
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim(),
  address: z.string().trim(),
  website: z.string().trim(),
  reportingCurrencyCode: z.string().trim().length(3),
});

export async function updateCompanyProfileAction(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid company settings.");
  }
  const reportingCurrency = await prisma.currency.findFirst({
    where: { code: parsed.data.reportingCurrencyCode, active: true },
    select: { code: true },
  });
  if (!reportingCurrency) {
    throw new Error("Select an active reporting currency. Apply the core currency migration if none are available.");
  }

  await prisma.$transaction(async (tx) => {
    const previous = await tx.companyProfile.findUnique({
      where: { singletonKey: "primary" },
    });
    const profile = await tx.companyProfile.upsert({
      where: { singletonKey: "primary" },
      update: {
        ...parsed.data,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        website: parsed.data.website || null,
      },
      create: {
        singletonKey: "primary",
        ...parsed.data,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        website: parsed.data.website || null,
      },
    });
    await writeAuditEvent(tx, {
      actorId: user.id,
      action: previous ? "company.updated" : "company.created",
      entityType: "CompanyProfile",
      entityId: profile.id,
      previous,
      next: profile,
    });
  });

  revalidatePath("/settings");
}

const exchangeRateSchema = z.object({
  baseCurrencyCode: z.string().trim().length(3),
  quoteCurrencyCode: z.string().trim().length(3),
  rate: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid exchange rate."),
  effectiveAt: z.coerce.date(),
  sourceReference: z.string().trim(),
});

export async function createExchangeRateAction(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = exchangeRateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid exchange rate.");
  }
  if (parsed.data.baseCurrencyCode === parsed.data.quoteCurrencyCode) {
    throw new Error("Choose two different currencies.");
  }
  const configuredCurrencies = await prisma.currency.count({
    where: {
      active: true,
      code: { in: [parsed.data.baseCurrencyCode, parsed.data.quoteCurrencyCode] },
    },
  });
  if (configuredCurrencies !== 2) {
    throw new Error("Both exchange-rate currencies must be active.");
  }

  const rate = new Prisma.Decimal(parsed.data.rate);
  if (!rate.isPositive()) throw new Error("Exchange rate must be greater than zero.");

  await prisma.$transaction(async (tx) => {
    const created = await tx.exchangeRate.create({
      data: {
        baseCurrencyCode: parsed.data.baseCurrencyCode,
        quoteCurrencyCode: parsed.data.quoteCurrencyCode,
        rate,
        effectiveAt: parsed.data.effectiveAt,
        sourceReference: parsed.data.sourceReference || null,
      },
    });
    await writeAuditEvent(tx, {
      actorId: user.id,
      action: "exchange-rate.created",
      entityType: "ExchangeRate",
      entityId: created.id,
      next: created,
    });
  });

  revalidatePath("/settings");
}
