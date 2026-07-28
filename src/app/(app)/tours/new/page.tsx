import Link from "next/link";
import { ArrowLeft, FileText, PackageOpen, Route, Sparkles } from "lucide-react";
import { packageNights } from "@/modules/packages/presentation";
import { createTourFromWizardAction } from "@/modules/tours/actions/create-tour";
import { prisma } from "@/server/db/prisma";

export const metadata = { title: "Create tour" };
export const dynamic = "force-dynamic";

const input = "mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm";
const tourTypes = [
  "CUSTOM",
  "STANDARD_PACKAGE",
  "GROUP_DEPARTURE",
  "PRIVATE",
  "CORPORATE",
  "SCHOOL",
  "DAY",
  "MULTI_DAY",
] as const;

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function NewTourPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; packageId?: string; enquiryId?: string }>;
}) {
  const query = await searchParams;
  const mode = ["direct", "package", "enquiry"].includes(query.mode ?? "")
    ? query.mode
    : "";
  const [customers, currencies, packages, enquiries] = await Promise.all([
    prisma.customer.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, reference: true, phone: true },
    }),
    prisma.currency.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.tourPackage.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.enquiry.findMany({
      where: {
        status: { notIn: ["LOST", "CANCELLED"] },
        tours: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { fullName: true } } },
    }),
  ]);

  if (!mode) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link href="/tours" className="inline-flex items-center gap-2 text-sm text-[#68736e]">
          <ArrowLeft className="size-4" /> Back to tours
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">
          Guided tour creation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">How should this tour start?</h1>
        <p className="mt-3 text-sm text-[#68736e]">
          Every option opens the same tour workspace. Choose the fastest starting point.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Link href="/tours/new?mode=enquiry" className="rounded-2xl border bg-white p-6 hover:border-[#176b55]">
            <FileText className="size-6 text-[#176b55]" />
            <h2 className="mt-5 font-semibold">From an enquiry</h2>
            <p className="mt-2 text-sm leading-6 text-[#68736e]">Carry an existing customer request into planning.</p>
            <p className="mt-5 text-sm font-semibold text-[#176b55]">{enquiries.length} available</p>
          </Link>
          <Link href="/tours/new?mode=package" className="rounded-2xl border bg-white p-6 hover:border-[#176b55]">
            <PackageOpen className="size-6 text-[#176b55]" />
            <h2 className="mt-5 font-semibold">Use a standard package</h2>
            <p className="mt-2 text-sm leading-6 text-[#68736e]">Copy a reusable itinerary, costs, pricing, and terms.</p>
            <p className="mt-5 text-sm font-semibold text-[#176b55]">{packages.length} available</p>
          </Link>
          <Link href="/tours/new?mode=direct" className="rounded-2xl border bg-white p-6 hover:border-[#176b55]">
            <Sparkles className="size-6 text-[#176b55]" />
            <h2 className="mt-5 font-semibold">Create a custom direct tour</h2>
            <p className="mt-2 text-sm leading-6 text-[#68736e]">Start immediately without creating an enquiry first.</p>
            <p className="mt-5 text-sm font-semibold text-[#176b55]">Start from blank</p>
          </Link>
        </div>
      </div>
    );
  }

  const selectedPackage = packages.find((entry) => entry.id === query.packageId);
  const selectedEnquiry = enquiries.find((entry) => entry.id === query.enquiryId);
  if (mode === "package" && !selectedPackage) {
    return (
      <SelectionPage title="Choose a standard package" back="/tours/new">
        {packages.map((entry) => (
          <Link
            key={entry.id}
            href={`/tours/new?mode=package&packageId=${entry.id}`}
            className="rounded-2xl border bg-white p-5 hover:border-[#176b55]"
          >
            <p className="text-xs font-semibold text-[#176b55]">{entry.reference} · revision {entry.revision}</p>
            <h2 className="mt-3 font-semibold">{entry.name}</h2>
            <p className="mt-2 text-sm text-[#68736e]">{entry.durationDays} days / {packageNights(entry.durationDays)} nights · {entry.defaultAdults + entry.defaultChildren} guests</p>
            <p className="mt-4 text-xs text-[#7b8580]">{entry.description ?? "No description"}</p>
          </Link>
        ))}
        {!packages.length ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="font-semibold">No packages yet</p>
            <Link href="/packages" className="mt-3 inline-block text-sm font-semibold text-[#176b55]">Create the first package</Link>
          </div>
        ) : null}
      </SelectionPage>
    );
  }
  if (mode === "enquiry" && !selectedEnquiry) {
    return (
      <SelectionPage title="Choose an enquiry" back="/tours/new">
        {enquiries.map((entry) => (
          <Link
            key={entry.id}
            href={`/tours/new?mode=enquiry&enquiryId=${entry.id}`}
            className="rounded-2xl border bg-white p-5 hover:border-[#176b55]"
          >
            <p className="text-xs font-semibold text-[#176b55]">{entry.reference}</p>
            <h2 className="mt-3 font-semibold">{entry.customer.fullName}</h2>
            <p className="mt-2 text-sm text-[#68736e]">{entry.adults} adults · {entry.children} children</p>
            <p className="mt-4 text-xs text-[#7b8580]">{entry.destinationsOfInterest.join(", ") || "Destinations not selected"}</p>
          </Link>
        ))}
        {!enquiries.length ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="font-semibold">No unconverted enquiries</p>
            <Link href="/enquiries/new" className="mt-3 inline-block text-sm font-semibold text-[#176b55]">Create an enquiry</Link>
          </div>
        ) : null}
      </SelectionPage>
    );
  }

  const today = new Date();
  const defaultStart = selectedEnquiry?.proposedStartDate ?? today;
  const defaultEnd =
    selectedEnquiry?.proposedEndDate ??
    new Date(defaultStart.getTime() + ((selectedPackage?.durationDays ?? 6) - 1) * 86_400_000);
  const defaultCustomerId = selectedEnquiry?.customerId ?? "";
  const defaultAdults = selectedEnquiry?.adults ?? selectedPackage?.defaultAdults ?? 2;
  const defaultChildren = selectedEnquiry?.children ?? selectedPackage?.defaultChildren ?? 0;
  const defaultCosting = selectedPackage?.costingCurrencyCode ?? "USD";
  const defaultQuotation =
    selectedEnquiry?.budgetCurrencyCode ?? selectedPackage?.quotationCurrencyCode ?? "USD";

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/tours/new" className="inline-flex items-center gap-2 text-sm text-[#68736e]">
        <ArrowLeft className="size-4" /> Change starting point
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <Route className="size-6 text-[#176b55]" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176b55]">
            {mode === "package" ? `Package · ${selectedPackage?.reference}` : mode === "enquiry" ? `Enquiry · ${selectedEnquiry?.reference}` : "Direct tour"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Create tour</h1>
        </div>
      </div>

      <form action={createTourFromWizardAction} className="mt-7 rounded-2xl border bg-white p-6">
        <input type="hidden" name="mode" value={mode.toUpperCase()} />
        <input type="hidden" name="packageId" value={selectedPackage?.id ?? ""} />
        <input type="hidden" name="enquiryId" value={selectedEnquiry?.id ?? ""} />

        {mode !== "enquiry" ? (
          <section>
            <h2 className="font-semibold">Customer</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">Existing customer
                <select className={input} name="customerId" defaultValue="">
                  <option value="">Create a new customer below</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.reference}</option>)}
                </select>
              </label>
              <label className="text-sm">New customer name<input className={input} name="newCustomerName" /></label>
              <label className="text-sm">Phone<input className={input} name="newCustomerPhone" /></label>
              <label className="text-sm sm:col-span-2">Email<input className={input} name="newCustomerEmail" type="email" /></label>
            </div>
          </section>
        ) : (
          <input type="hidden" name="customerId" value={defaultCustomerId} />
        )}

        <section className={`${mode !== "enquiry" ? "mt-7 border-t pt-7" : ""}`}>
          <h2 className="font-semibold">Tour essentials</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Tour name
              <input className={input} name="name" required defaultValue={selectedPackage?.name ?? (selectedEnquiry ? `${selectedEnquiry.customer.fullName} Tour` : "")} />
            </label>
            <label className="text-sm">Tour type
              <select className={input} name="type" defaultValue={selectedPackage?.type ?? "CUSTOM"}>
                {tourTypes.map((type) => <option key={type} value={type}>{type.toLowerCase().replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <div />
            <label className="text-sm">Start date<input className={input} name="startDate" type="date" required defaultValue={dateValue(defaultStart)} /></label>
            <label className="text-sm">End date<input className={input} name="endDate" type="date" required defaultValue={dateValue(defaultEnd)} /></label>
            <label className="text-sm">Adults<input className={input} name="adults" type="number" min={1} required defaultValue={defaultAdults} /></label>
            <label className="text-sm">Children<input className={input} name="children" type="number" min={0} required defaultValue={defaultChildren} /></label>
            <label className="text-sm">Costing currency
              <select className={input} name="costingCurrencyCode" defaultValue={defaultCosting}>{currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select>
            </label>
            <label className="text-sm">Quotation currency
              <select className={input} name="quotationCurrencyCode" defaultValue={defaultQuotation}>{currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select>
            </label>
          </div>
        </section>
        <div className="mt-7 flex justify-end">
          <button className="h-11 rounded-xl bg-[#176b55] px-6 text-sm font-semibold text-white">
            Create tour and open workspace
          </button>
        </div>
      </form>
    </div>
  );
}

function SelectionPage({
  title,
  back,
  children,
}: {
  title: string;
  back: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <Link href={back} className="inline-flex items-center gap-2 text-sm text-[#68736e]">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
