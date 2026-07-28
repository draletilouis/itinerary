import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Copy, Send } from "lucide-react";
import { ItineraryItemForm } from "@/components/itinerary-item-form";
import { TourWorkspaceNav } from "@/components/tour-workspace-nav";
import {
  createItineraryRevisionAction,
  duplicateItineraryDayAction,
  publishItineraryVersionAction,
  updateItineraryDayAction,
  updateItineraryVersionAction,
} from "@/modules/itineraries/actions/itineraries";
import { getItinerary, getItineraryOptions } from "@/modules/itineraries/queries/itineraries";

export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";
const area = "mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm";

export default async function ItineraryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  const { version: requestedVersion } = await searchParams;
  const itinerary = await getItinerary(id);
  if (!itinerary) notFound();
  const selected =
    itinerary.versions.find((item) => item.versionNumber === Number(requestedVersion)) ??
    itinerary.versions.find((item) => item.versionNumber === itinerary.currentVersionNumber) ??
    itinerary.versions[0];
  if (!selected) notFound();
  const destinationIds = [
    ...new Set(
      selected.days
        .map((day) => day.destinationId)
        .filter((destinationId): destinationId is string => Boolean(destinationId)),
    ),
  ];
  const options = await getItineraryOptions(destinationIds);
  const editable = selected.status === "DRAFT";

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/itineraries" className="inline-flex items-center gap-2 text-sm text-[#68736e]"><ArrowLeft className="size-4" /> Back to itineraries</Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex flex-wrap gap-3"><span className="rounded-full bg-[#edf5f1] px-2.5 py-1 text-xs font-semibold text-[#176b55]">{itinerary.reference}</span><span className="rounded-full bg-[#f1f3ef] px-2.5 py-1 text-xs capitalize">{selected.status.toLowerCase().replaceAll("_", " ")}</span></div><h1 className="mt-3 text-3xl font-semibold tracking-tight">{selected.title}</h1><p className="mt-2 text-sm text-[#68736e]">{itinerary.tour?.name} · {itinerary.tour?.customer.fullName}</p></div>
        <div className="flex flex-wrap gap-2">{itinerary.versions.map((item) => <Link key={item.id} href={`/itineraries/${itinerary.id}?version=${item.versionNumber}`} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${item.id === selected.id ? "bg-[#176b55] text-white" : "bg-white"}`}>v{item.versionNumber}</Link>)}</div>
      </div>
      {itinerary.tour ? <TourWorkspaceNav tourId={itinerary.tour.id} active="itinerary" itineraryId={itinerary.id} bookingId={itinerary.tour.booking?.id} /> : null}

      <section className="mt-6 rounded-2xl border bg-white p-5">
        {editable ? (
          <form action={updateItineraryVersionAction} className="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="itineraryId" value={itinerary.id} /><input type="hidden" name="versionId" value={selected.id} />
            <label className="text-sm font-medium">Title<input className={input} name="title" required defaultValue={selected.title} /></label>
            <label className="text-sm font-medium">Summary<input className={input} name="summary" defaultValue={selected.summary ?? ""} /></label>
            <label className="text-sm font-medium lg:col-span-2">Introduction<textarea className={area} name="introduction" defaultValue={selected.introduction ?? ""} /></label>
            <label className="text-sm font-medium">Inclusions, one per line<textarea className={area} name="inclusions" defaultValue={selected.inclusions.join("\n")} /></label>
            <label className="text-sm font-medium">Exclusions, one per line<textarea className={area} name="exclusions" defaultValue={selected.exclusions.join("\n")} /></label>
            <label className="text-sm font-medium">Important notes<textarea className={area} name="importantNotes" defaultValue={selected.importantNotes ?? ""} /></label>
            <label className="text-sm font-medium">Terms<textarea className={area} name="terms" defaultValue={selected.terms ?? ""} /></label>
            <div className="lg:col-span-2"><button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Save itinerary details</button></div>
          </form>
        ) : (
          <div><p className="text-sm leading-7 text-[#59635e]">{selected.introduction ?? "No introduction provided."}</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><h3 className="text-sm font-semibold">Inclusions</h3><ul className="mt-2 space-y-1 text-sm text-[#68736e]">{selected.inclusions.map((item) => <li key={item}>• {item}</li>)}</ul></div><div><h3 className="text-sm font-semibold">Exclusions</h3><ul className="mt-2 space-y-1 text-sm text-[#68736e]">{selected.exclusions.map((item) => <li key={item}>• {item}</li>)}</ul></div></div></div>
        )}
      </section>

      <section className="mt-6 space-y-4">
        {selected.days.map((day) => (
          <details key={day.id} className="overflow-hidden rounded-2xl border bg-white" open={selected.days.length <= 3}>
            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4"><span className="grid size-11 place-items-center rounded-xl bg-[#edf5f1] text-sm font-bold text-[#176b55]">{day.dayNumber}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{day.title}</span><span className="mt-1 block text-xs text-[#7b8580]">{day.date?.toLocaleDateString("en-UG") ?? "No date"} · {day.destination?.name ?? "Destination not set"}</span></span><CalendarDays className="size-5 text-[#7b8580]" /></summary>
            <div className="border-t p-5">
              {editable ? (
                <form action={updateItineraryDayAction} className="grid gap-4 lg:grid-cols-2">
                  <input type="hidden" name="itineraryId" value={itinerary.id} /><input type="hidden" name="versionId" value={selected.id} /><input type="hidden" name="dayId" value={day.id} />
                  <label className="text-xs">Day title<input className={input} name="title" required defaultValue={day.title} /></label>
                  <label className="text-xs">Main destination<select className={input} name="destinationId" defaultValue={day.destinationId ?? ""}><option value="">Not set</option>{options.destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="text-xs">Start location<input className={input} name="startLocation" defaultValue={day.startLocation ?? ""} /></label>
                  <label className="text-xs">End location<input className={input} name="endLocation" defaultValue={day.endLocation ?? ""} /></label>
                  <label className="text-xs lg:col-span-2">Client narrative<textarea className={area} name="clientNarrative" defaultValue={day.clientNarrative ?? ""} /></label>
                  <label className="text-xs">Meals, comma separated<input className={input} name="meals" defaultValue={day.meals.join(", ")} /></label>
                  <label className="text-xs">Transport<input className={input} name="transport" defaultValue={day.transport ?? ""} /></label>
                  <div className="lg:col-span-2 flex gap-3"><button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">Save day</button></div>
                </form>
              ) : <p className="text-sm leading-7 text-[#59635e]">{day.clientNarrative ?? "No client narrative."}</p>}

              <div className="mt-5 divide-y rounded-xl border">
                {day.items.map((item) => <div key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[90px_1fr_auto]"><span className="text-xs font-semibold text-[#176b55]">{item.startTime ?? "Any time"}</span><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-[#7b8580]">{item.clientDescription ?? item.type.toLowerCase()}</p></div><span className="text-[11px] capitalize text-[#8b948f]">{item.type.toLowerCase()}</span></div>)}
                {!day.items.length ? <p className="px-4 py-6 text-center text-xs text-[#8b948f]">No timed items yet.</p> : null}
              </div>

              {editable ? <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]"><ItineraryItemForm
                itineraryId={itinerary.id}
                versionId={selected.id}
                dayId={day.id}
                destinationId={day.destinationId}
                destinationName={day.destination?.name ?? null}
                activities={options.activities}
                accommodations={options.accommodations}
              /><form action={duplicateItineraryDayAction} className="self-end"><input type="hidden" name="itineraryId" value={itinerary.id} /><input type="hidden" name="versionId" value={selected.id} /><input type="hidden" name="dayId" value={day.id} /><button className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold"><Copy className="size-4" /> Duplicate day</button></form></div> : null}
            </div>
          </details>
        ))}
      </section>

      <section className="mt-6 flex flex-wrap justify-end gap-3 rounded-2xl border bg-white p-5">
        {editable ? <form action={publishItineraryVersionAction}><input type="hidden" name="itineraryId" value={itinerary.id} /><input type="hidden" name="versionId" value={selected.id} /><button className="flex h-11 items-center gap-2 rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white"><Send className="size-4" /> Publish version {selected.versionNumber}</button></form> : <form action={createItineraryRevisionAction} className="flex gap-3"><input type="hidden" name="itineraryId" value={itinerary.id} /><input type="hidden" name="versionId" value={selected.id} /><input className="h-11 rounded-xl border px-3 text-sm" name="changeNote" placeholder="Revision note" /><button className="h-11 rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white">Create new version</button></form>}
      </section>
    </div>
  );
}
