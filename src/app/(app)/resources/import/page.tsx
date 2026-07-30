import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { importVehiclesCsvAction } from "@/modules/resources/actions/imports";

export const metadata = { title: "Import resources" };

export default function ResourceImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-semibold text-[#011478]">
        <ArrowLeft className="size-4" /> Back to resources
      </Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#011478]">
        Controlled import
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Import vehicles</h1>
      <p className="mt-2 text-sm leading-6 text-[#4b5563]">
        Upload up to 1,000 vehicle records in one atomic transaction. Any invalid
        or duplicate row rejects the complete file, so partial imports cannot occur.
      </p>

      <section className="mt-7 rounded-xl border bg-white p-6">
        <div className="flex items-center gap-3"><FileSpreadsheet className="size-5 text-[#011478]" /><h2 className="font-semibold">CSV file</h2></div>
        <p className="mt-3 text-xs leading-5 text-[#6b7280]">
          Required columns: <code>registration, make, model, vehicleType, capacity, ownership</code>.
          Optional columns: <code>colour, notes</code>. Maximum size: 512 KB.
        </p>
        <form action={importVehiclesCsvAction} className="mt-6 space-y-4">
          <input className="block w-full rounded-lg border bg-[#f9fafb] p-4 text-sm" name="file" type="file" accept=".csv,text/csv" required />
          <button className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white">Validate and import</button>
        </form>
      </section>

      <p className="mt-5 flex items-center gap-2 text-xs text-[#6b7280]">
        <ShieldCheck className="size-4 text-[#011478]" />
        Duplicate registrations are rejected and successful imports are audited.
      </p>
    </div>
  );
}
