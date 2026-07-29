import Link from "next/link";
import { ArrowLeft, BedDouble, Compass, MapPin, Ticket } from "lucide-react";
import {
  addAccommodationRateAction,
  addActivityRateAction,
  addRoomTypeAction,
  createAccommodationAction,
  createActivityAction,
  createDestinationAction,
} from "@/modules/catalogue/actions/catalogue";
import { getCatalogue } from "@/modules/catalogue/queries/catalogue";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Tour catalogue" };
export const dynamic = "force-dynamic";

const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";

export default async function CataloguePage() {
  const data = await getCatalogue();
  const roomTypes = data.accommodations.flatMap((accommodation) =>
    accommodation.roomTypes.map((room) => ({
      ...room,
      accommodationName: accommodation.name,
    })),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-[#68736e]">
        <ArrowLeft className="size-4" /> Back to settings
      </Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">Reusable tour content</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tour catalogue</h1>
      <p className="mt-3 text-sm text-[#68736e]">
        Destinations, activities, accommodation, room types, and effective-dated supplier rates.
      </p>

      <div className="mt-7 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <MapPin className="size-5 text-[#176b55]" />
            <div><h2 className="font-semibold">Destinations</h2><p className="text-xs text-[#7b8580]">{data.destinations.length} records</p></div>
          </div>
          <div className="mt-4 max-h-56 divide-y overflow-y-auto">
            {data.destinations.map((item) => (
              <div key={item.id} className="py-3">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-[#7b8580]">{item.country} - {item._count.activities} activities - {item._count.accommodations} stays</p>
              </div>
            ))}
          </div>
          <details className="mt-4 border-t pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#176b55]">Add destination</summary>
            <form action={createDestinationAction} className="mt-4 space-y-3">
              <label className="block text-xs">Name<input className={input} name="name" required /></label>
              <label className="block text-xs">Country<input className={input} name="country" required /></label>
              <label className="block text-xs">Region<input className={input} name="region" /></label>
              <label className="block text-xs">Short description<input className={input} name="shortDescription" /></label>
              <label className="block text-xs">Best travel periods<input className={input} name="bestTravelPeriods" /></label>
              <label className="block text-xs">Typical stay days<input className={input} name="typicalStayDays" type="number" min={1} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs">Latitude<input className={input} name="latitude" /></label>
                <label className="block text-xs">Longitude<input className={input} name="longitude" /></label>
              </div>
              <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Save destination</button>
            </form>
          </details>
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <Ticket className="size-5 text-[#176b55]" />
            <div><h2 className="font-semibold">Activities</h2><p className="text-xs text-[#7b8580]">{data.activities.length} records</p></div>
          </div>
          <div className="mt-4 max-h-56 divide-y overflow-y-auto">
            {data.activities.map((item) => (
              <div key={item.id} className="py-3">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-[#7b8580]">{item.destination.name} - {item.category}</p>
                {item.rates[0] ? <p className="mt-1 text-xs font-semibold text-[#176b55]">From {formatMoney(item.rates[0].amount.toString(), item.rates[0].currencyCode)}</p> : null}
              </div>
            ))}
          </div>
          <details className="mt-4 border-t pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#176b55]">Add activity</summary>
            <form action={createActivityAction} className="mt-4 space-y-3">
              <label className="block text-xs">Name<input className={input} name="name" required /></label>
              <label className="block text-xs">Destination<select className={input} name="destinationId" required>{data.destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="block text-xs">Category<input className={input} name="category" required placeholder="Wildlife, cultural, adventure" /></label>
              <label className="block text-xs">Supplier<select className={input} name="supplierId"><option value="">None</option>{data.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="block text-xs">Duration minutes<input className={input} name="durationMinutes" type="number" min={1} /></label>
              <label className="block text-xs">Capacity<input className={input} name="capacity" type="number" min={1} /></label>
              <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Save activity</button>
            </form>
          </details>
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <BedDouble className="size-5 text-[#176b55]" />
            <div><h2 className="font-semibold">Accommodation</h2><p className="text-xs text-[#7b8580]">{data.accommodations.length} records</p></div>
          </div>
          <div className="mt-4 max-h-56 divide-y overflow-y-auto">
            {data.accommodations.map((item) => (
              <div key={item.id} className="py-3">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-[#7b8580]">{item.destination.name} - {item.type} - {item.roomTypes.length} room types</p>
                {item.rates[0] ? <p className="mt-1 text-xs font-semibold text-[#176b55]">From {formatMoney(item.rates[0].amount.toString(), item.rates[0].currencyCode)}</p> : null}
              </div>
            ))}
          </div>
          <details className="mt-4 border-t pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#176b55]">Add accommodation</summary>
            <form action={createAccommodationAction} className="mt-4 space-y-3">
              <label className="block text-xs">Name<input className={input} name="name" required /></label>
              <label className="block text-xs">Destination<select className={input} name="destinationId" required>{data.destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="block text-xs">Type<select className={input} name="type">{["Hotel","Lodge","Camp","Guesthouse","Apartment","Hostel","Resort","Homestay"].map((type) => <option key={type}>{type}</option>)}</select></label>
              <label className="block text-xs">Supplier<select className={input} name="supplierId"><option value="">None</option>{data.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="block text-xs">Rating or class<input className={input} name="rating" /></label>
              <label className="block text-xs">Amenities, comma separated<input className={input} name="amenities" /></label>
              <label className="block text-xs">Meal plans, comma separated<input className={input} name="mealPlans" /></label>
              <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Save accommodation</button>
            </form>
          </details>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border bg-white p-5">
        <div className="flex items-center gap-3"><Compass className="size-5 text-[#176b55]" /><div><h2 className="font-semibold">Rates and room types</h2><p className="text-xs text-[#7b8580]">New effective dates create historical rate records; existing rates are never overwritten.</p></div></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-semibold">Add activity rate</summary>
            <form action={addActivityRateAction} className="mt-4 space-y-3">
              <select className={input} name="activityId" required>{data.activities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input className={input} name="rateType" required placeholder="Adult non-resident" />
              <div className="grid grid-cols-2 gap-3"><input className={input} name="amount" required placeholder="Amount" /><select className={input} name="currencyCode">{data.currencies.map((item) => <option key={item.code}>{item.code}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3"><input className={input} name="startDate" type="date" required /><input className={input} name="endDate" type="date" /></div>
              <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Save rate</button>
            </form>
          </details>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-semibold">Add room type</summary>
            <form action={addRoomTypeAction} className="mt-4 space-y-3">
              <select className={input} name="accommodationId" required>{data.accommodations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input className={input} name="name" required placeholder="Room name" />
              <div className="grid grid-cols-3 gap-3"><input className={input} name="maximumOccupancy" type="number" min={1} required placeholder="Max" /><input className={input} name="adultCapacity" type="number" min={1} required placeholder="Adults" /><input className={input} name="childCapacity" type="number" min={0} defaultValue={0} required placeholder="Children" /></div>
              <input className={input} name="bedConfiguration" placeholder="1 king bed" />
              <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Save room type</button>
            </form>
          </details>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-semibold">Add accommodation rate</summary>
            <form action={addAccommodationRateAction} className="mt-4 space-y-3">
              <label className="block text-xs">Room type and capacity<select className={input} name="roomTypeId" required>{roomTypes.map((item) => <option key={item.id} value={item.id}>{item.accommodationName} - {item.name} - up to {item.maximumOccupancy} guest(s)</option>)}</select></label>
              <p className="rounded-lg bg-[#f2f8f5] px-3 py-2 text-[11px] text-[#59635e]">Occupancy and accommodation are taken automatically from the selected room type.</p>
              <input className={input} name="mealPlan" required placeholder="Meal plan, e.g. Full board" />
              <div className="grid grid-cols-2 gap-3"><input className={input} name="amount" required placeholder="Amount" /><select className={input} name="currencyCode">{data.currencies.map((item) => <option key={item.code}>{item.code}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3"><input className={input} name="startDate" type="date" required /><input className={input} name="endDate" type="date" /></div>
              <label className="flex items-center gap-2 text-xs"><input name="taxIncluded" type="checkbox" /> Tax included</label>
              <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Save rate</button>
            </form>
          </details>
        </div>
      </section>
    </div>
  );
}
