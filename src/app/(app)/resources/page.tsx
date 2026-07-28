import {
  AlertTriangle,
  CalendarClock,
  CarFront,
  CheckCircle2,
  CircleUserRound,
  ShieldAlert,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
import {
  createResourceAction,
  createResourceAvailabilityAction,
  createVehicleMaintenanceAction,
  setResourceAssignmentStatusAction,
  setResourceStatusAction,
} from "@/modules/resources/actions/resources";
import { getResourcesWorkspace } from "@/modules/resources/queries/resources";
import { BulkResourceAssignmentForm } from "@/components/bulk-resource-assignment-form";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Resources" };
export const dynamic = "force-dynamic";

const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";
const area = "mt-2 min-h-20 w-full rounded-xl border bg-white px-3 py-2 text-sm";
const today = new Date().toISOString().slice(0, 10);

function resourceName(entry: {
  vehicle?: { registration: string; make?: string; model?: string } | null;
  driver?: { fullName: string } | null;
  guide?: { fullName: string } | null;
  equipment?: { name: string } | null;
}) {
  if (entry.vehicle) {
    return `${entry.vehicle.registration}${entry.vehicle.make ? ` · ${entry.vehicle.make} ${entry.vehicle.model ?? ""}` : ""}`;
  }
  return entry.driver?.fullName ?? entry.guide?.fullName ?? entry.equipment?.name ?? "Unknown";
}

export default async function ResourcesPage() {
  const data = await getResourcesWorkspace();
  const resourceOptions = [
    ...data.vehicles
      .filter((entry) => entry.status === "ACTIVE")
      .map((entry) => ({
        type: "VEHICLE" as const,
        id: entry.id,
        label: `${entry.registration} · ${entry.make} ${entry.model}`,
      })),
    ...data.drivers
      .filter((entry) => entry.status === "ACTIVE")
      .map((entry) => ({ type: "DRIVER" as const, id: entry.id, label: entry.fullName })),
    ...data.guides
      .filter((entry) => entry.status === "ACTIVE")
      .map((entry) => ({ type: "GUIDE" as const, id: entry.id, label: entry.fullName })),
    ...data.equipment
      .filter((entry) => entry.status === "ACTIVE")
      .map((entry) => ({ type: "EQUIPMENT" as const, id: entry.id, label: entry.name })),
  ] as const;

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#176b55]">
        Phase 9 · Resource control
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Resources</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68736e]">
        Vehicles, drivers, guides, equipment, maintenance, availability, and
        conflict-controlled tour assignments.
      </p>

      <a href="/resources/import" className="mt-5 inline-flex h-10 items-center rounded-xl border bg-white px-4 text-sm font-semibold text-[#176b55]">
        Import vehicles CSV
      </a>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          [CarFront, "Active vehicles", data.metrics.activeVehicles],
          [CircleUserRound, "Active drivers", data.metrics.activeDrivers],
          [UserRoundCheck, "Active guides", data.metrics.activeGuides],
          [CalendarClock, "Current assignments", data.metrics.currentAssignments],
          [Wrench, "Maintenance blocks", data.metrics.maintenanceBlocks],
          [ShieldAlert, "Conflict overrides", data.metrics.overriddenConflicts],
        ].map(([Icon, label, value]) => {
          const CardIcon = Icon as typeof CarFront;
          return (
            <article key={String(label)} className="rounded-2xl border bg-white p-5">
              <CardIcon className="size-5 text-[#176b55]" />
              <p className="mt-4 text-xs text-[#7b8580]">{String(label)}</p>
              <p className="mt-2 text-2xl font-semibold">{String(value)}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <details className="rounded-2xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Register vehicle
          </summary>
          <form action={createResourceAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <input type="hidden" name="resourceType" value="VEHICLE" />
            <label className="text-xs">Registration<input className={input} name="registration" required /></label>
            <label className="text-xs">Vehicle type<input className={input} name="vehicleType" required placeholder="Safari van, coach, SUV" /></label>
            <label className="text-xs">Make<input className={input} name="make" required /></label>
            <label className="text-xs">Model<input className={input} name="model" required /></label>
            <label className="text-xs">Capacity<input className={input} name="capacity" type="number" min={1} required /></label>
            <label className="text-xs">Ownership<select className={input} name="ownership" required defaultValue="OWNED"><option>OWNED</option><option>LEASED</option><option>SUPPLIER</option></select></label>
            <label className="text-xs">Manufacture year<input className={input} name="manufactureYear" type="number" min={1900} /></label>
            <label className="text-xs">Colour<input className={input} name="colour" /></label>
            <label className="text-xs sm:col-span-2">Supplier<select className={input} name="supplierId" defaultValue=""><option value="">Internal fleet</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label className="text-xs sm:col-span-2">Notes<textarea className={area} name="notes" /></label>
            <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white sm:col-span-2">Register vehicle</button>
          </form>
        </details>

        <details className="rounded-2xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Add driver
          </summary>
          <form action={createResourceAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <input type="hidden" name="resourceType" value="DRIVER" />
            <label className="text-xs">Full name<input className={input} name="name" required /></label>
            <label className="text-xs">Phone<input className={input} name="phone" required /></label>
            <label className="text-xs">Email<input className={input} name="email" type="email" /></label>
            <label className="text-xs">Licence number<input className={input} name="licenceNumber" required /></label>
            <label className="text-xs">Licence class<input className={input} name="licenceClass" /></label>
            <label className="text-xs">Licence expiry<input className={input} name="licenceExpiry" type="date" /></label>
            <label className="text-xs">Emergency contact<input className={input} name="emergencyContact" /></label>
            <label className="text-xs">Supplier<select className={input} name="supplierId" defaultValue=""><option value="">Internal driver</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label className="text-xs sm:col-span-2">Notes<textarea className={area} name="notes" /></label>
            <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white sm:col-span-2">Add driver</button>
          </form>
        </details>

        <details className="rounded-2xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Add guide
          </summary>
          <form action={createResourceAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <input type="hidden" name="resourceType" value="GUIDE" />
            <label className="text-xs">Full name<input className={input} name="name" required /></label>
            <label className="text-xs">Phone<input className={input} name="phone" required /></label>
            <label className="text-xs">Email<input className={input} name="email" type="email" /></label>
            <label className="text-xs">Languages<input className={input} name="languages" placeholder="English, Luganda" /></label>
            <label className="text-xs">Specialities<input className={input} name="specialities" placeholder="Birding, culture" /></label>
            <label className="text-xs">Certification<input className={input} name="certification" /></label>
            <label className="text-xs">Certification expiry<input className={input} name="certificationExpiry" type="date" /></label>
            <label className="text-xs">Supplier<select className={input} name="supplierId" defaultValue=""><option value="">Internal guide</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label className="text-xs sm:col-span-2">Notes<textarea className={area} name="notes" /></label>
            <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white sm:col-span-2">Add guide</button>
          </form>
        </details>

        <details className="rounded-2xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Add equipment
          </summary>
          <form action={createResourceAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <input type="hidden" name="resourceType" value="EQUIPMENT" />
            <label className="text-xs">Name<input className={input} name="name" required /></label>
            <label className="text-xs">Category<input className={input} name="category" required /></label>
            <label className="text-xs">Quantity<input className={input} name="quantity" type="number" min={1} defaultValue={1} required /></label>
            <label className="text-xs sm:col-span-2">Notes<textarea className={area} name="notes" /></label>
            <button className="h-10 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white sm:col-span-2">Add equipment</button>
          </form>
        </details>
      </section>

      <section className="mt-6 space-y-4">
        <BulkResourceAssignmentForm
          tours={data.tours.map((tour) => ({
            id: tour.id,
            reference: tour.reference,
            name: tour.name,
            startDate: tour.startDate.toISOString().slice(0, 10),
            endDate: tour.endDate.toISOString().slice(0, 10),
          }))}
          resources={resourceOptions}
        />

        <div className="grid gap-4 xl:grid-cols-2">
        <details className="rounded-2xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Record availability
          </summary>
          <form action={createResourceAvailabilityAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <label className="text-xs">Resource type<select className={input} name="resourceType" required defaultValue="VEHICLE">{["VEHICLE","DRIVER","GUIDE","EQUIPMENT"].map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="text-xs">Resource<select className={input} name="resourceId" required defaultValue=""><option value="" disabled>Select matching resource</option>{resourceOptions.map((resource) => <option key={`${resource.type}-${resource.id}`} value={resource.id}>[{resource.type}] {resource.label}</option>)}</select></label>
            <label className="text-xs">Availability<select className={input} name="type" required defaultValue="UNAVAILABLE"><option>AVAILABLE</option><option>UNAVAILABLE</option><option>LEAVE</option><option>RESERVED</option></select></label>
            <label className="text-xs">Reason<input className={input} name="reason" /></label>
            <label className="text-xs">From<input className={input} name="startDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">To<input className={input} name="endDate" type="date" required defaultValue={today} /></label>
            <button className="h-10 rounded-xl border px-4 text-sm font-semibold sm:col-span-2">Save availability</button>
          </form>
        </details>

        <details className="rounded-2xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Schedule vehicle maintenance
          </summary>
          <form action={createVehicleMaintenanceAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <label className="text-xs sm:col-span-2">Vehicle<select className={input} name="vehicleId" required defaultValue=""><option value="" disabled>Select vehicle</option>{data.vehicles.filter((vehicle) => vehicle.status === "ACTIVE").map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select></label>
            <label className="text-xs sm:col-span-2">Description<input className={input} name="description" required /></label>
            <label className="text-xs">From<input className={input} name="startDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">To<input className={input} name="endDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">Provider<input className={input} name="serviceProvider" /></label>
            <label className="text-xs">Odometer km<input className={input} name="odometerKm" type="number" min={0} /></label>
            <label className="text-xs">Cost<input className={input} name="cost" defaultValue="0" required /></label>
            <label className="text-xs">Currency<select className={input} name="currencyCode" defaultValue="UGX">{data.currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></label>
            <label className="text-xs sm:col-span-2">Notes<input className={input} name="notes" /></label>
            <button className="h-10 rounded-xl border px-4 text-sm font-semibold sm:col-span-2">Schedule maintenance</button>
          </form>
        </details>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Tour assignments</h2>
          <p className="mt-1 text-xs text-[#7b8580]">Inclusive dates are conflict-checked against assignments, availability blocks, and vehicle maintenance.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-[#f8f8f5] text-xs uppercase text-[#7b8580]">
              <tr><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Tour</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Control</th></tr>
            </thead>
            <tbody className="divide-y">
              {data.assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-5 py-4"><p className="font-semibold">{resourceName(assignment)}</p><p className="text-xs text-[#7b8580]">{assignment.resourceType.toLowerCase()}</p>{assignment.conflictOverrideReason ? <p className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="size-3" /> Override: {assignment.conflictOverrideReason}</p> : null}</td>
                  <td className="px-5 py-4">{assignment.tour.reference} · {assignment.tour.name}</td>
                  <td className="px-5 py-4">{assignment.startDate.toLocaleDateString("en-UG")} – {assignment.endDate.toLocaleDateString("en-UG")}</td>
                  <td className="px-5 py-4 capitalize">{assignment.status.toLowerCase()}</td>
                  <td className="px-5 py-4">
                    {!["CANCELLED","COMPLETED"].includes(assignment.status) ? (
                      <form action={setResourceAssignmentStatusAction} className="flex gap-2">
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <button name="status" value="CONFIRMED" className="rounded-lg border px-2 py-1 text-xs">Confirm</button>
                        <button name="status" value="CANCELLED" className="rounded-lg border px-2 py-1 text-xs text-red-700">Cancel</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!data.assignments.length ? <tr><td colSpan={5} className="px-5 py-10 text-center text-[#7b8580]">No resource assignments yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-semibold">Fleet and people</h2>
          {[...data.vehicles.map((entry) => ({ id: entry.id, type: "VEHICLE", title: `${entry.registration} · ${entry.make} ${entry.model}`, detail: `${entry.vehicleType} · ${entry.capacity} seats · ${entry.ownership}`, status: entry.status })),
            ...data.drivers.map((entry) => ({ id: entry.id, type: "DRIVER", title: entry.fullName, detail: `${entry.phone} · licence ${entry.licenceNumber}`, status: entry.status })),
            ...data.guides.map((entry) => ({ id: entry.id, type: "GUIDE", title: entry.fullName, detail: `${entry.phone} · ${entry.languages.join(", ") || "Languages not recorded"}`, status: entry.status })),
            ...data.equipment.map((entry) => ({ id: entry.id, type: "EQUIPMENT", title: entry.name, detail: `${entry.category} · quantity ${entry.quantity}`, status: entry.status }))].map((resource) => (
              <article key={`${resource.type}-${resource.id}`} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="font-semibold">{resource.title}</p><p className="mt-1 text-xs text-[#7b8580]">{resource.detail}</p></div>
                  <span className="rounded-full bg-[#edf5f1] px-2.5 py-1 text-xs capitalize">{resource.status.toLowerCase().replaceAll("_"," ")}</span>
                </div>
                {resource.status !== "ARCHIVED" ? <details className="mt-3"><summary className="cursor-pointer text-xs text-[#176b55]">Change status</summary><form action={setResourceStatusAction} className="mt-2 grid gap-2 sm:grid-cols-[140px_1fr_auto]"><input type="hidden" name="resourceType" value={resource.type} /><input type="hidden" name="resourceId" value={resource.id} /><select className="h-9 rounded-lg border px-2 text-xs" name="status" defaultValue={resource.status}><option>ACTIVE</option><option>INACTIVE</option><option>OUT_OF_SERVICE</option><option>ARCHIVED</option></select><input className="h-9 rounded-lg border px-2 text-xs" name="reason" required placeholder="Reason" /><button className="h-9 rounded-lg border px-3 text-xs">Update</button></form></details> : null}
              </article>
            ))}
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-semibold">Upcoming availability blocks</h2>
            {data.availability.map((entry) => <article key={entry.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-4"><div><p className="font-semibold">{resourceName(entry)}</p><p className="mt-1 text-xs text-[#7b8580]">{entry.startDate.toLocaleDateString("en-UG")} – {entry.endDate.toLocaleDateString("en-UG")} · {entry.reason ?? "No reason"}</p></div><span className="text-xs capitalize">{entry.type.toLowerCase()}</span></div></article>)}
            {!data.availability.length ? <p className="rounded-2xl border bg-white p-5 text-sm text-[#7b8580]">No future availability blocks.</p> : null}
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">Vehicle maintenance</h2>
            {data.maintenance.map((entry) => <article key={entry.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-4"><div><p className="font-semibold">{entry.vehicle.registration} · {entry.description}</p><p className="mt-1 text-xs text-[#7b8580]">{entry.startDate.toLocaleDateString("en-UG")} – {entry.endDate.toLocaleDateString("en-UG")} · {entry.serviceProvider ?? "Provider not set"}</p></div><div className="text-right"><p className="font-semibold">{formatMoney(entry.cost.toString(),entry.currencyCode)}</p><p className="text-xs capitalize text-[#7b8580]">{entry.status.toLowerCase().replaceAll("_"," ")}</p></div></div></article>)}
            {!data.maintenance.length ? <p className="rounded-2xl border bg-white p-5 text-sm text-[#7b8580]">No upcoming maintenance.</p> : null}
          </div>
        </div>
      </section>

      <p className="mt-8 flex items-center gap-2 text-xs text-[#7b8580]">
        <CheckCircle2 className="size-4 text-[#176b55]" />
        Conflict overrides remain visible and permanently audited.
      </p>
    </div>
  );
}
