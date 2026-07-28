import Link from "next/link";
import { ArrowRight, PackageOpen, Plus } from "lucide-react";
import { PackageBasicsForm } from "@/components/package-basics-form";
import { packageNights } from "@/modules/packages/presentation";
import {
  getPackageOptions,
  listTourPackages,
} from "@/modules/packages/queries/packages";

export const metadata = { title: "Standard packages" };
export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const [packages, options] = await Promise.all([
    listTourPackages(),
    getPackageOptions(),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">
            Reusable tour templates
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Standard packages
          </h1>
          <p className="mt-3 text-sm text-[#68736e]">
            Prepare an itinerary and its standard costs once, then reuse it for
            many customers.
          </p>
        </div>
        <Link
          href="/tours/new?mode=package"
          className="inline-flex h-11 items-center rounded-xl border bg-white px-4 text-sm font-semibold text-[#176b55]"
        >
          Create tour from package
        </Link>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="grid content-start gap-4 sm:grid-cols-2">
          {packages.map((entry) => (
            <Link
              key={entry.id}
              href={`/packages/${entry.id}`}
              className="rounded-2xl border bg-white p-5 hover:border-[#176b55]"
            >
              <div className="flex items-start justify-between gap-3">
                <PackageOpen className="size-5 text-[#176b55]" />
                <span className="rounded-full bg-[#f1f3ef] px-2.5 py-1 text-[11px]">
                  Revision {entry.revision}
                </span>
              </div>
              <p className="mt-5 text-xs font-semibold text-[#176b55]">
                {entry.reference}
              </p>
              <h2 className="mt-2 font-semibold">{entry.name}</h2>
              <p className="mt-2 text-sm text-[#68736e]">
                {entry.durationDays} days / {packageNights(entry.durationDays)} nights
              </p>
              <p className="mt-1 text-xs text-[#7b8580]">
                {entry.costs.length} standard costs ·{" "}
                {entry.defaultAdults + entry.defaultChildren} default guests
              </p>
              <div className="mt-5 flex items-center justify-between text-xs text-[#7b8580]">
                <span>{entry._count.tours} tours created</span>
                <ArrowRight className="size-4 text-[#176b55]" />
              </div>
            </Link>
          ))}
          {!packages.length ? (
            <div className="rounded-2xl border border-dashed p-10 text-center sm:col-span-2">
              <PackageOpen className="mx-auto size-7 text-[#176b55]" />
              <p className="mt-4 font-semibold">No standard packages yet</p>
              <p className="mt-2 text-sm text-[#7b8580]">
                Create the basic package first, then add its itinerary and costs.
              </p>
            </div>
          ) : null}
        </section>

        <section className="h-fit rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-[#176b55]" />
            <div>
              <h2 className="font-semibold">New package</h2>
              <p className="mt-1 text-xs text-[#7b8580]">
                Start with the essentials. Everything else comes next.
              </p>
            </div>
          </div>
          <PackageBasicsForm currencies={options.currencies} />
        </section>
      </div>
    </div>
  );
}
