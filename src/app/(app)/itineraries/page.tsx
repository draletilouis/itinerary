import Link from "next/link";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { listItineraries } from "@/modules/itineraries/queries/itineraries";

export const metadata = { title: "Itineraries" };
export const dynamic = "force-dynamic";

export default async function ItinerariesPage() {
  const itineraries = await listItineraries();
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#011478]">Guest experience</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Itineraries</h1><p className="mt-3 text-sm text-[#4b5563]">Build day-by-day plans with immutable published versions and separate internal notes.</p></div>
        <Link href="/itineraries/new" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white"><Plus className="size-4" /> New itinerary</Link>
      </div>
      <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {itineraries.map((item) => (
          <Link key={item.id} href={`/itineraries/${item.id}`} className="rounded-xl border bg-white p-5 hover:border-[#bfdbfe]">
            <div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-lg bg-[#eff3ff] text-[#011478]"><FileText className="size-5" /></span><span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] capitalize">{item.status.toLowerCase().replaceAll("_", " ")}</span></div>
            <h2 className="mt-4 font-semibold">{item.title}</h2>
            <p className="mt-1 text-xs text-[#6b7280]">{item.reference} · version {item.currentVersionNumber}</p>
            <p className="mt-4 text-sm text-[#4b5563]">{item.tour?.name ?? "Unlinked itinerary"}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-[#6b7280]"><span>{item._count.versions} versions</span><ArrowRight className="size-4 text-[#011478]" /></div>
          </Link>
        ))}
        {!itineraries.length ? <p className="rounded-xl border border-dashed p-12 text-center text-sm text-[#6b7280]">No itineraries yet. Create one from an active tour.</p> : null}
      </section>
    </div>
  );
}
