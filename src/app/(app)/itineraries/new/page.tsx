import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createItineraryAction } from "@/modules/itineraries/actions/itineraries";
import { getItineraryOptions } from "@/modules/itineraries/queries/itineraries";

export const metadata = { title: "New itinerary" };
export const dynamic = "force-dynamic";

export default async function NewItineraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tourId?: string }>;
}) {
  const { tourId } = await searchParams;
  const options = await getItineraryOptions();
  const input = "mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm";
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/itineraries" className="inline-flex items-center gap-2 text-sm text-[#68736e]"><ArrowLeft className="size-4" /> Back to itineraries</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">New itinerary</h1>
      <p className="mt-2 text-sm text-[#68736e]">The first draft automatically receives one day for every tour day.</p>
      <form action={createItineraryAction} className="mt-7 space-y-5 rounded-2xl border bg-white p-6">
        <label className="block text-sm font-medium">Tour<select className={input} name="tourId" required defaultValue={tourId}>{options.tours.map((tour) => <option key={tour.id} value={tour.id}>{tour.reference} · {tour.name} · {tour.customer.fullName}</option>)}</select></label>
        <label className="block text-sm font-medium">Itinerary title<input className={input} name="title" required /></label>
        <label className="block text-sm font-medium">Introduction<textarea className="mt-2 min-h-32 w-full rounded-xl border p-3 text-sm" name="introduction" /></label>
        <div className="flex justify-end"><button className="h-11 rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white">Create itinerary</button></div>
      </form>
    </div>
  );
}
