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
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">Guest experience</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Itineraries</h1><p className="mt-3 text-sm text-[#68736e]">Build day-by-day plans with immutable published versions and separate internal notes.</p></div>
        <Link href="/itineraries/new" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white"><Plus className="size-4" /> New itinerary</Link>
      </div>
      <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {itineraries.map((item) => (
          <Link key={item.id} href={`/itineraries/${item.id}`} className="rounded-2xl border bg-white p-5 hover:border-[#b8cfc7]">
            <div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-[#edf5f1] text-[#176b55]"><FileText className="size-5" /></span><span className="rounded-full bg-[#f1f3ef] px-2.5 py-1 text-[11px] capitalize">{item.status.toLowerCase().replaceAll("_", " ")}</span></div>
            <h2 className="mt-4 font-semibold">{item.title}</h2>
            <p className="mt-1 text-xs text-[#7b8580]">{item.reference} · version {item.currentVersionNumber}</p>
            <p className="mt-4 text-sm text-[#59635e]">{item.tour?.name ?? "Unlinked itinerary"}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-[#7b8580]"><span>{item._count.versions} versions</span><ArrowRight className="size-4 text-[#176b55]" /></div>
          </Link>
        ))}
        {!itineraries.length ? <p className="rounded-2xl border border-dashed p-12 text-center text-sm text-[#7b8580]">No itineraries yet. Create one from an active tour.</p> : null}
      </section>
    </div>
  );
}
