import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  MapPinned,
  PackageOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { PackageCostForm } from "@/components/package-cost-form";
import { PackagePricingForm } from "@/components/package-pricing-form";
import {
  addPackageItemAction,
  removePackageCostAction,
  updatePackageDayAction,
  updateTourPackageBasicsAction,
} from "@/modules/packages/actions/packages";
import {
  estimatePackageCost,
  packageCostBasisLabels,
  packageNights,
} from "@/modules/packages/presentation";
import {
  getPackageOptions,
  getTourPackage,
} from "@/modules/packages/queries/packages";

export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";
const area = "mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm";

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entry, options] = await Promise.all([
    getTourPackage(id),
    getPackageOptions(),
  ]);
  if (!entry) notFound();

  const nights = packageNights(entry.durationDays);
  const defaultTravellers = entry.defaultAdults + entry.defaultChildren;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/packages"
        className="inline-flex items-center gap-2 text-sm text-[#68736e]"
      >
        <ArrowLeft className="size-4" /> Back to packages
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176b55]">
            {entry.reference} · revision {entry.revision}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{entry.name}</h1>
          <p className="mt-2 text-sm text-[#68736e]">
            {entry.durationDays} days / {nights} nights · {defaultTravellers} default
            guests · used by {entry._count.tours} tours
          </p>
        </div>
        <Link
          href={`/tours/new?mode=package&packageId=${entry.id}`}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white"
        >
          <PackageOpen className="size-4" /> Use this package
        </Link>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [CheckCircle2, "1", "Package basics", `${entry.durationDays} days / ${nights} nights`],
          [MapPinned, "2", "Itinerary", `${entry.days.length} day plans`],
          [Calculator, "3", "Standard costs", `${entry.costs.length} cost items`],
          [
            CheckCircle2,
            "4",
            "Price and review",
            `${entry.defaultMarkupMethod.toLowerCase().replaceAll("_", " ")} ${entry.defaultMarkupValue.toString()}`,
          ],
        ].map(([Icon, number, label, value]) => {
          const StepIcon = Icon as typeof CheckCircle2;
          return (
            <article key={String(number)} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-[#edf5f1] text-xs font-semibold text-[#176b55]">
                  {String(number)}
                </span>
                <StepIcon className="size-4 text-[#176b55]" />
              </div>
              <p className="mt-3 text-sm font-semibold">{String(label)}</p>
              <p className="mt-1 text-xs text-[#7b8580]">{String(value)}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#176b55]">
            Step 1
          </p>
          <h2 className="mt-1 font-semibold">Package basics</h2>
          <p className="mt-1 text-xs text-[#7b8580]">
            Define the standard duration, guests and currency. Nights are calculated
            automatically from the days.
          </p>
        </div>
        <form
          action={updateTourPackageBasicsAction}
          className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="packageId" value={entry.id} />
          <label className="text-xs font-medium lg:col-span-2">
            Package name
            <input className={input} name="name" required defaultValue={entry.name} />
          </label>
          <label className="text-xs font-medium">
            Tour days
            <input
              className={input}
              name="durationDays"
              type="number"
              min={1}
              max={60}
              required
              defaultValue={entry.durationDays}
            />
          </label>
          <div className="rounded-xl bg-[#f2f8f5] p-3">
            <p className="text-xs text-[#68736e]">Current duration</p>
            <p className="mt-2 text-sm font-semibold text-[#176b55]">
              {entry.durationDays} days / {nights} nights
            </p>
          </div>
          <label className="text-xs font-medium">
            Default adults
            <input
              className={input}
              name="defaultAdults"
              type="number"
              min={1}
              required
              defaultValue={entry.defaultAdults}
            />
          </label>
          <label className="text-xs font-medium">
            Default children
            <input
              className={input}
              name="defaultChildren"
              type="number"
              min={0}
              required
              defaultValue={entry.defaultChildren}
            />
          </label>
          <label className="text-xs font-medium">
            Internal costing currency
            <select
              className={input}
              name="costingCurrencyCode"
              defaultValue={entry.costingCurrencyCode}
            >
              {options.currencies.map((currency) => (
                <option key={currency.code}>{currency.code}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Customer currency
            <select
              className={input}
              name="quotationCurrencyCode"
              defaultValue={entry.quotationCurrencyCode}
            >
              {options.currencies.map((currency) => (
                <option key={currency.code}>{currency.code}</option>
              ))}
            </select>
          </label>

          <details className="rounded-xl border bg-[#fafaf7] sm:col-span-2 lg:col-span-4">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#176b55]">
              Customer wording and advanced package details
            </summary>
            <div className="grid gap-4 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-medium">
                Package type
                <select className={input} name="type" defaultValue={entry.type}>
                  <option value="STANDARD_PACKAGE">Standard package</option>
                  <option value="GROUP_DEPARTURE">Group departure</option>
                  <option value="PRIVATE">Private tour</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="SCHOOL">School trip</option>
                  <option value="DAY">Day tour</option>
                  <option value="MULTI_DAY">Multi-day tour</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </label>
              <label className="text-xs font-medium lg:col-span-3">
                Internal description
                <input
                  className={input}
                  name="description"
                  defaultValue={entry.description ?? ""}
                />
              </label>
              <label className="text-xs font-medium sm:col-span-2 lg:col-span-4">
                Customer summary
                <input
                  className={input}
                  name="summary"
                  defaultValue={entry.summary ?? ""}
                  placeholder="A short headline for the proposal"
                />
              </label>
              <label className="text-xs font-medium sm:col-span-2 lg:col-span-4">
                Customer introduction
                <textarea
                  className={area}
                  name="introduction"
                  defaultValue={entry.introduction ?? ""}
                />
              </label>
              <label className="text-xs font-medium sm:col-span-2">
                Inclusions, one per line
                <textarea
                  className={area}
                  name="inclusions"
                  defaultValue={entry.inclusions.join("\n")}
                />
              </label>
              <label className="text-xs font-medium sm:col-span-2">
                Exclusions, one per line
                <textarea
                  className={area}
                  name="exclusions"
                  defaultValue={entry.exclusions.join("\n")}
                />
              </label>
              <label className="text-xs font-medium sm:col-span-2">
                Important notes
                <textarea
                  className={area}
                  name="importantNotes"
                  defaultValue={entry.importantNotes ?? ""}
                />
              </label>
              <label className="text-xs font-medium sm:col-span-2">
                Terms
                <textarea className={area} name="terms" defaultValue={entry.terms ?? ""} />
              </label>
            </div>
          </details>
          <div className="lg:col-span-4">
            <button className="h-10 rounded-xl border bg-[#f8f8f5] px-4 text-sm font-semibold">
              Save package basics
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#176b55]">
            Step 2
          </p>
          <h2 className="mt-1 font-semibold">Itinerary</h2>
          <p className="mt-1 text-xs text-[#7b8580]">
            Complete the day title, destination and client narrative first. Open
            “More day details” only when needed.
          </p>
        </div>
        {entry.days.map((day) => {
          const overnightAfterDay = day.dayNumber <= nights;
          return (
            <details key={day.dayNumber} className="rounded-2xl border bg-white">
              <summary className="cursor-pointer px-5 py-4">
                <span className="font-semibold">
                  Day {day.dayNumber} · {day.title}
                </span>
                <span className="ml-3 rounded-full bg-[#f1f3ef] px-2.5 py-1 text-[11px] text-[#68736e]">
                  {overnightAfterDay ? "Overnight after this day" : "Departure / no package night"}
                </span>
              </summary>
              <div className="border-t p-5">
                <form
                  action={updatePackageDayAction}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <input type="hidden" name="packageId" value={entry.id} />
                  <input type="hidden" name="dayNumber" value={day.dayNumber} />
                  <label className="text-xs font-medium">
                    Day title
                    <input
                      className={input}
                      name="title"
                      required
                      defaultValue={day.title}
                    />
                  </label>
                  <label className="text-xs font-medium">
                    Destination
                    <select
                      className={input}
                      name="destinationId"
                      defaultValue={day.destinationId ?? ""}
                    >
                      <option value="">Not set</option>
                      {options.destinations.map((destination) => (
                        <option key={destination.id} value={destination.id}>
                          {destination.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium sm:col-span-2">
                    Client narrative
                    <textarea
                      className={area}
                      name="clientNarrative"
                      defaultValue={day.clientNarrative ?? ""}
                      placeholder="Describe what the guest will experience on this day."
                    />
                  </label>

                  <details className="rounded-xl border bg-[#fafaf7] sm:col-span-2">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#176b55]">
                      More day details
                    </summary>
                    <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                      <label className="text-xs font-medium">
                        Start location
                        <input
                          className={input}
                          name="startLocation"
                          defaultValue={day.startLocation ?? ""}
                        />
                      </label>
                      <label className="text-xs font-medium">
                        End location
                        <input
                          className={input}
                          name="endLocation"
                          defaultValue={day.endLocation ?? ""}
                        />
                      </label>
                      <label className="text-xs font-medium">
                        Meals, comma separated
                        <input
                          className={input}
                          name="meals"
                          defaultValue={day.meals.join(", ")}
                        />
                      </label>
                      <label className="text-xs font-medium">
                        Transport
                        <input
                          className={input}
                          name="transport"
                          defaultValue={day.transport ?? ""}
                        />
                      </label>
                    </div>
                  </details>
                  <div className="sm:col-span-2">
                    <button className="h-10 rounded-xl border px-4 text-sm font-semibold">
                      Save day
                    </button>
                  </div>
                </form>

                <div className="mt-5 divide-y rounded-xl border">
                  {day.items.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="px-4 py-3">
                      <p className="text-sm font-medium">
                        {item.startTime ? `${item.startTime} · ` : ""}
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-[#7b8580]">
                        {item.type.toLowerCase()} ·{" "}
                        {item.clientDescription ?? "No client description"}
                      </p>
                    </div>
                  ))}
                  {!day.items.length ? (
                    <p className="px-4 py-5 text-xs text-[#7b8580]">
                      No activities, accommodation or other items added yet.
                    </p>
                  ) : null}
                </div>

                <details className="mt-4 rounded-xl bg-[#fafaf7] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#176b55]">
                    <Plus className="mr-1 inline size-4" /> Add itinerary item
                  </summary>
                  <form
                    action={addPackageItemAction}
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="packageId" value={entry.id} />
                    <input type="hidden" name="dayNumber" value={day.dayNumber} />
                    <label className="text-xs font-medium">
                      Item type
                      <select className={input} name="type">
                        <option value="ACTIVITY">Activity</option>
                        <option value="ACCOMMODATION">Accommodation / overnight</option>
                        <option value="TRANSPORT">Transport</option>
                        <option value="MEAL">Meal</option>
                        <option value="NOTE">Note</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>
                    <label className="text-xs font-medium">
                      Title
                      <input className={input} name="title" required />
                    </label>
                    <label className="text-xs font-medium">
                      Start time
                      <input className={input} name="startTime" type="time" />
                    </label>
                    <label className="text-xs font-medium">
                      End time
                      <input className={input} name="endTime" type="time" />
                    </label>
                    <label className="text-xs font-medium sm:col-span-2">
                      Client description
                      <input className={input} name="clientDescription" />
                    </label>
                    <details className="rounded-xl border bg-white sm:col-span-2">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#176b55]">
                        Link catalogue records or add internal notes
                      </summary>
                      <div className="grid gap-3 border-t p-4 sm:grid-cols-2">
                        <select className={input} name="activityId">
                          <option value="">No activity link</option>
                          {options.activities.map((activity) => (
                            <option key={activity.id} value={activity.id}>
                              {activity.name}
                            </option>
                          ))}
                        </select>
                        <select className={input} name="accommodationId">
                          <option value="">No accommodation link</option>
                          {options.accommodations.map((accommodation) => (
                            <option key={accommodation.id} value={accommodation.id}>
                              {accommodation.name}
                            </option>
                          ))}
                        </select>
                        <select className={input} name="supplierId">
                          <option value="">No supplier link</option>
                          {options.suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </details>
                    <div className="sm:col-span-2">
                      <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">
                        Add itinerary item
                      </button>
                    </div>
                  </form>
                </details>
              </div>
            </details>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#176b55]">
            Step 3
          </p>
          <h2 className="mt-1 font-semibold">Standard costs</h2>
          <p className="mt-1 text-xs text-[#7b8580]">
            Only fields used by the selected charging method are shown. Exchange
            rates are refreshed when the package becomes a tour.
          </p>
        </div>
        <div className="divide-y">
          {entry.costs.map((cost, index) => {
            const preview = estimatePackageCost(cost);
            const supplier = options.suppliers.find(
              (item) => item.id === cost.supplierId,
            );
            return (
              <div key={`${cost.description}-${index}`} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{cost.description}</p>
                  <p className="mt-1 text-xs text-[#7b8580]">
                    {cost.category} · {packageCostBasisLabels[cost.basis]}
                    {supplier ? ` · ${supplier.name}` : ""}
                    {cost.dayNumber ? ` · Day ${cost.dayNumber}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-[#59635e]">
                    {cost.originalCurrencyCode} {preview.formula} ={" "}
                    <span className="font-semibold">
                      {cost.originalCurrencyCode}{" "}
                      {preview.total.toLocaleString("en-UG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                </div>
                <form action={removePackageCostAction}>
                  <input type="hidden" name="packageId" value={entry.id} />
                  <input type="hidden" name="costIndex" value={index} />
                  <button
                    aria-label={`Remove ${cost.description}`}
                    className="p-2 text-red-700"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            );
          })}
          {!entry.costs.length ? (
            <p className="px-5 py-8 text-center text-sm text-[#7b8580]">
              No standard costs yet. Add accommodation, guide, transport and
              activity costs below.
            </p>
          ) : null}
        </div>
        <details className="border-t bg-[#fafaf7]" open={!entry.costs.length}>
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[#176b55]">
            Add a standard cost
          </summary>
          <div className="border-t p-5">
            <PackageCostForm
              packageId={entry.id}
              durationDays={entry.durationDays}
              defaultTravellers={defaultTravellers}
              costingCurrencyCode={entry.costingCurrencyCode}
              currencies={options.currencies}
              suppliers={options.suppliers}
              itineraryDays={entry.days.map((day) => ({
                dayNumber: day.dayNumber,
                title: day.title,
              }))}
            />
          </div>
        </details>
      </section>

      <section className="mt-6 rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#176b55]">
            Step 4
          </p>
          <h2 className="mt-1 font-semibold">Price and review</h2>
          <p className="mt-1 text-xs text-[#7b8580]">
            Choose the normal profit rule. Tax, discounts and margin protection
            remain available under advanced pricing.
          </p>
        </div>
        <div className="grid gap-6 p-5 xl:grid-cols-[1fr_320px]">
          <PackagePricingForm
            packageId={entry.id}
            defaults={{
              contingencyMethod: entry.defaultContingencyMethod,
              contingencyValue: entry.defaultContingencyValue.toString(),
              markupMethod: entry.defaultMarkupMethod,
              markupValue: entry.defaultMarkupValue.toString(),
              taxMethod: entry.defaultTaxMethod,
              taxValue: entry.defaultTaxValue.toString(),
              discountMethod: entry.defaultDiscountMethod,
              discountValue: entry.defaultDiscountValue.toString(),
              minimumMargin: entry.minimumMargin?.toString() ?? "",
            }}
          />
          <aside className="rounded-xl bg-[#f2f8f5] p-5">
            <h3 className="text-sm font-semibold">Package review</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#68736e]">Duration</dt>
                <dd className="font-semibold">
                  {entry.durationDays}D / {nights}N
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#68736e]">Default guests</dt>
                <dd className="font-semibold">{defaultTravellers}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#68736e]">Standard costs</dt>
                <dd className="font-semibold">{entry.costs.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#68736e]">Customer currency</dt>
                <dd className="font-semibold">{entry.quotationCurrencyCode}</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-5 text-[#68736e]">
              The final selling price is recalculated when this package is used,
              using the tour’s guest count, dates and current exchange rates.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
