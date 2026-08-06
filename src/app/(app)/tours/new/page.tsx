import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TourCreationForm } from "@/components/tour-creation-form";
import { prisma } from "@/server/db/prisma";
import { getPricingCurrencyCodes } from "@/modules/costing/services/pricing-currencies";

export const metadata = { title: "Create tour" };
export const dynamic = "force-dynamic";

export default async function NewTourPage() {
  const pricingCurrencyCodes = await getPricingCurrencyCodes();
  const [customers, currencies, packages, enquiries] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, reference: true } }),
    prisma.currency.findMany({ where: { active: true, code: { in: pricingCurrencyCodes } }, orderBy: { code: "asc" }, select: { code: true } }),
    prisma.tourPackage.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, reference: true, revision: true, name: true, type: true, durationDays: true, defaultAdults: true, defaultChildren: true, costingCurrencyCode: true, quotationCurrencyCode: true } }),
    prisma.enquiry.findMany({ where: { status: { notIn: ["LOST", "CANCELLED"] }, tours: { none: {} } }, orderBy: { createdAt: "desc" }, select: { id: true, reference: true, customerId: true, proposedStartDate: true, proposedEndDate: true, adults: true, children: true, budgetCurrencyCode: true, customer: { select: { fullName: true } } } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/tours" className="inline-flex items-center gap-2 text-sm text-[#4b5563]"><ArrowLeft className="size-4" /> Back to tours</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#011478]">New tour</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create everything in one place</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b5563]">Choose a starting point, confirm the essentials, and continue in the tour workspace.</p>
      <TourCreationForm customers={customers} currencies={currencies} packages={packages} enquiries={enquiries.map(({ customer, ...item }) => ({ ...item, customerName: customer.fullName, proposedStartDate: item.proposedStartDate?.toISOString().slice(0, 10) ?? null, proposedEndDate: item.proposedEndDate?.toISOString().slice(0, 10) ?? null }))} />
    </div>
  );
}
