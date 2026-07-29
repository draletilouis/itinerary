import Link from "next/link";
import {
  AlertOctagon,
  CheckCircle2,
  ClipboardCheck,
  FileDown,
  PlayCircle,
  ShieldCheck,
  TimerReset,
  UsersRound,
} from "lucide-react";
import {
  createOperationalTaskAction,
  createSupplierConfirmationAction,
  generateOperationalDocumentAction,
  initializeTourOperationsAction,
  refreshTourReadinessAction,
  reportTourIncidentAction,
  resolveTourIncidentAction,
  setOperationalTaskStatusAction,
  setSupplierConfirmationStatusAction,
} from "@/modules/operations/actions/operations";
import { getOperationsWorkspace } from "@/modules/operations/queries/operations";
import { setTourStatusAction } from "@/modules/tours/actions/tours";

export const metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";
const area = "mt-2 min-h-20 w-full rounded-xl border bg-white px-3 py-2 text-sm";
const nowLocal = new Date().toISOString().slice(0, 16);

function resourceName(entry: {
  vehicle?: { registration: string; make: string; model: string } | null;
  driver?: { fullName: string } | null;
  guide?: { fullName: string } | null;
  equipment?: { name: string } | null;
}) {
  if (entry.vehicle) return `${entry.vehicle.registration}  -  ${entry.vehicle.make} ${entry.vehicle.model}`;
  return entry.driver?.fullName ?? entry.guide?.fullName ?? entry.equipment?.name ?? "Unknown";
}

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ tour?: string; prepared?: string; tasks?: string; suppliers?: string }> }) {
  const query = await searchParams;
  const selectedTourId = query.tour ?? "";
  const data = await getOperationsWorkspace();

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#176b55]">
        Phase 10  -  Operational control
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tour operations</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68736e]">
        Readiness, tasks, supplier confirmations, live-tour control, incidents,
        and frozen operational documents.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/resources" className="h-10 rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Resources</Link>
        <Link href="/suppliers" className="h-10 rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Suppliers</Link>
        <Link href="/documents" className="h-10 rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Documents</Link>
      </div>

      {query.prepared === "1" ? (
        <section className="mt-7 rounded-2xl border border-[#b8cfc7] bg-[#f2f8f5] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#176b55]">Booking confirmed - preparation created</p>
          <h2 className="mt-2 text-lg font-semibold">Continue with the highlighted tour below</h2>
          <p className="mt-1 text-sm text-[#59635e]">Created automatically: {query.tasks ?? "0"} preparation task(s). {query.suppliers ?? "0"} supplier confirmation record(s) are available for optional tracking.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-3"><p className="text-xs font-semibold">1. Complete travellers</p><p className="mt-1 text-[11px] text-[#68736e]">Add the lead guest and missing traveller details.</p></div>
            <div className="rounded-xl bg-white p-3"><p className="text-xs font-semibold">2. Assign resources</p><p className="mt-1 text-[11px] text-[#68736e]">Select the required vehicle, driver and guide.</p></div>
            <div className="rounded-xl bg-white p-3"><p className="text-xs font-semibold">3. Generate and start</p><p className="mt-1 text-[11px] text-[#68736e]">Generate the operations pack, clear blockers and start.</p></div>
          </div>
        </section>
      ) : null}


      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [TimerReset, "Preparing", data.metrics.preparing],
          [ShieldCheck, "Ready", data.metrics.ready],
          [PlayCircle, "Active tours", data.metrics.active],
          [ClipboardCheck, "Overdue tasks", data.metrics.overdueTasks],
          [AlertOctagon, "Open incidents", data.metrics.openIncidents],
        ].map(([Icon, label, value]) => {
          const CardIcon = Icon as typeof TimerReset;
          return <article key={String(label)} className="rounded-2xl border bg-white p-5"><CardIcon className="size-5 text-[#176b55]" /><p className="mt-4 text-xs text-[#7b8580]">{String(label)}</p><p className="mt-2 text-2xl font-semibold">{String(value)}</p></article>;
        })}
      </section>

      <section className="mt-6 space-y-5">
        {data.tours.map((tour) => (
          <article id={`tour-${tour.id}`} key={tour.id} className={`scroll-mt-6 overflow-hidden rounded-2xl border bg-white ${selectedTourId === tour.id ? "ring-2 ring-[#176b55] ring-offset-2" : ""}`}>
            <div className="border-b bg-[#123d32] px-6 py-5 text-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#eac58f]">{tour.reference}  -  {tour.status.toLowerCase().replaceAll("_"," ")}</p>
                  <h2 className="mt-2 text-xl font-semibold">{tour.name}</h2>
                  <p className="mt-1 text-sm text-white/65">{tour.customer.fullName}  -  {tour.startDate.toLocaleDateString("en-UG")}  -  {tour.endDate.toLocaleDateString("en-UG")}</p>
                </div>
                <div className="min-w-56 rounded-xl bg-white/10 p-4">
                  <div className="flex items-center justify-between"><span className="text-xs">Operational readiness</span><span className="font-semibold">{tour.readiness.score}%</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#eac58f]" style={{ width: `${tour.readiness.score}%` }} /></div>
                  <p className="mt-2 text-xs text-white/60">{tour.readiness.ready ? "All controls passed." : `${tour.readiness.blockers.length} blocker${tour.readiness.blockers.length === 1 ? "" : "s"} remain.`}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">Readiness controls</h3>
                    <form action={refreshTourReadinessAction}><input type="hidden" name="tourId" value={tour.id} /><button className="rounded-xl border px-3 py-2 text-xs font-semibold">Recalculate status</button></form>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {tour.readiness.checks.map((check) => <div key={check.key} className={`rounded-xl border p-3 ${check.passed ? "bg-[#f2f8f5]" : "bg-amber-50"}`}><div className="flex gap-2"><CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${check.passed ? "text-[#176b55]" : "text-amber-700"}`} /><div><p className="text-xs font-semibold">{check.label}</p><p className="mt-1 text-[11px] leading-4 text-[#7b8580]">{check.detail}</p></div></div></div>)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!tour.operationalTasks.length ? <form action={initializeTourOperationsAction}><input type="hidden" name="tourId" value={tour.id} /><button className="rounded-xl bg-[#176b55] px-4 py-2 text-xs font-semibold text-white">Initialize operations checklist</button></form> : null}
                    {tour.readiness.ready && tour.status !== "IN_PROGRESS" && tour.status !== "COMPLETED" ? <form action={setTourStatusAction}><input type="hidden" name="tourId" value={tour.id} /><input type="hidden" name="status" value="IN_PROGRESS" /><input type="hidden" name="reason" value="Operations started after readiness controls passed." /><button className="rounded-xl bg-[#123d32] px-4 py-2 text-xs font-semibold text-white">Start tour</button></form> : null}
                    {tour.status === "IN_PROGRESS" ? <form action={setTourStatusAction}><input type="hidden" name="tourId" value={tour.id} /><input type="hidden" name="status" value="COMPLETED" /><input type="hidden" name="reason" value="Tour operations completed." /><button className="rounded-xl border px-4 py-2 text-xs font-semibold">Complete tour</button></form> : null}
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold">Resources</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {tour.resourceAssignments.map((entry) => <div key={entry.id} className="rounded-xl bg-[#f8f8f5] p-3"><p className="text-xs font-semibold">{entry.resourceType}  -  {resourceName(entry)}</p><p className="mt-1 text-[11px] text-[#7b8580]">{entry.startDate.toLocaleDateString("en-UG")}  -  {entry.endDate.toLocaleDateString("en-UG")}  -  {entry.status.toLowerCase()}</p></div>)}
                    {!tour.resourceAssignments.length ? <p className="text-sm text-[#7b8580]">No resources assigned.</p> : null}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Next preparation tasks</h3>
                    <span className="text-xs text-[#7b8580]">{tour.operationalTasks.filter((task) => !["COMPLETED","WAIVED"].includes(task.status)).length} remaining</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {tour.operationalTasks.filter((task) => !["COMPLETED","WAIVED"].includes(task.status)).map((task) => <div key={task.id} className="rounded-xl border p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{task.title}{task.mandatory ? <span className="ml-2 text-[10px] uppercase text-red-700">Required</span> : <span className="ml-2 text-[10px] uppercase text-[#68736e]">Optional</span>}</p><p className="mt-1 text-xs text-[#7b8580]">{task.dueDate ? `Due ${task.dueDate.toLocaleDateString("en-UG")}` : "No due date"}</p></div><form action={setOperationalTaskStatusAction} className="flex gap-2"><input type="hidden" name="taskId" value={task.id} /><input className="h-8 rounded-lg border px-2 text-xs" name="reason" placeholder="Reason if waived" /><button name="status" value="COMPLETED" className="rounded-lg border px-2 text-xs">Done</button><button name="status" value="WAIVED" className="rounded-lg border px-2 text-xs text-amber-700">Skip</button></form></div></div>)}
                    {!tour.operationalTasks.some((task) => !["COMPLETED","WAIVED"].includes(task.status)) ? <p className="rounded-xl bg-[#f2f8f5] p-3 text-sm text-[#176b55]">All preparation tasks are complete.</p> : null}
                  </div>
                  {tour.operationalTasks.some((task) => ["COMPLETED","WAIVED"].includes(task.status)) ? <details className="mt-3 rounded-xl border"><summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[#68736e]">Completed tasks ({tour.operationalTasks.filter((task) => ["COMPLETED","WAIVED"].includes(task.status)).length})</summary><div className="space-y-2 border-t p-3">{tour.operationalTasks.filter((task) => ["COMPLETED","WAIVED"].includes(task.status)).map((task) => <div key={task.id} className="flex justify-between gap-3 text-xs"><span>{task.title}</span><span className="capitalize text-[#7b8580]">{task.status.toLowerCase()}</span></div>)}</div></details> : null}
                  <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[#176b55]">Add another task</summary><form action={createOperationalTaskAction} className="mt-3 grid gap-3 rounded-xl bg-[#f8f8f5] p-4 sm:grid-cols-2"><input type="hidden" name="tourId" value={tour.id} /><label className="text-xs">Title<input className={input} name="title" required /></label><label className="text-xs">Due date<input className={input} name="dueDate" type="date" /></label><label className="text-xs sm:col-span-2">Description<input className={input} name="description" /></label><label className="flex items-center gap-2 text-xs"><input name="mandatory" type="checkbox" /> Required before starting</label><button className="h-10 rounded-xl border px-3 text-xs font-semibold sm:col-span-2">Add task</button></form></details>
                </section>
              </div>

              <div className="space-y-6">
                <details className="rounded-xl border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Supplier confirmations <span className="font-normal text-[#68736e]">(optional - {tour.supplierConfirmations.length})</span></summary>
                  <div className="mt-3 space-y-2">
                    {tour.supplierConfirmations.map((confirmation) => <div key={confirmation.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{confirmation.supplier.name}</p><p className="mt-1 text-xs text-[#7b8580]">{confirmation.service}  -  {confirmation.serviceDate?.toLocaleDateString("en-UG") ?? "Date not set"}</p></div><span className="text-xs capitalize">{confirmation.status.toLowerCase()}</span></div>{confirmation.status !== "CONFIRMED" && confirmation.status !== "CANCELLED" ? <form action={setSupplierConfirmationStatusAction} className="mt-3 grid gap-2 sm:grid-cols-2"><input type="hidden" name="confirmationId" value={confirmation.id} /><input className="h-8 rounded-lg border px-2 text-xs" name="confirmedByName" placeholder="Confirmed by" /><input className="h-8 rounded-lg border px-2 text-xs" name="externalReference" placeholder="Reference" /><input className="h-8 rounded-lg border px-2 text-xs sm:col-span-2" name="notes" placeholder="Notes" /><div className="flex gap-2 sm:col-span-2"><button name="status" value="REQUESTED" className="rounded-lg border px-2 py-1 text-xs">Mark requested</button><button name="status" value="CONFIRMED" className="rounded-lg bg-[#176b55] px-2 py-1 text-xs text-white">Confirm</button><button name="status" value="DECLINED" className="rounded-lg border px-2 py-1 text-xs text-red-700">Declined</button></div></form> : null}</div>)}
                  </div>
                  <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[#176b55]">Add supplier service</summary><form action={createSupplierConfirmationAction} className="mt-3 grid gap-3 rounded-xl bg-[#f8f8f5] p-4 sm:grid-cols-2"><input type="hidden" name="tourId" value={tour.id} /><label className="text-xs sm:col-span-2">Supplier<select className={input} name="supplierId" required defaultValue=""><option value="" disabled>Select supplier</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} / {supplier.category.name}</option>)}</select></label><label className="text-xs">Service<input className={input} name="service" required /></label><label className="text-xs">Service date<input className={input} name="serviceDate" type="date" /></label><label className="text-xs">External reference<input className={input} name="externalReference" /></label><label className="text-xs">Notes<input className={input} name="notes" /></label><button className="h-10 rounded-xl border px-3 text-xs font-semibold sm:col-span-2">Add confirmation</button></form></details>
                </details>

                <section>
                  <div className="flex items-center justify-between"><h3 className="font-semibold">Incidents</h3><span className="text-xs text-[#7b8580]">{tour.incidents.length}</span></div>
                  <div className="mt-3 space-y-2">
                    {tour.incidents.map((incident) => <div key={incident.id} className={`rounded-xl border p-3 ${["HIGH","CRITICAL"].includes(incident.severity) && !["RESOLVED","CLOSED"].includes(incident.status) ? "border-red-300 bg-red-50" : ""}`}><p className="text-sm font-semibold">{incident.reference}  -  {incident.title}</p><p className="mt-1 text-xs text-[#7b8580]">{incident.severity.toLowerCase()}  -  {incident.status.toLowerCase()}  -  {incident.occurredAt.toLocaleString("en-UG")}</p><p className="mt-2 text-xs leading-5">{incident.description}</p>{incident.resolution ? <p className="mt-2 text-xs text-[#176b55]">Resolution: {incident.resolution}</p> : null}{!["RESOLVED","CLOSED"].includes(incident.status) ? <form action={resolveTourIncidentAction} className="mt-3 flex gap-2"><input type="hidden" name="incidentId" value={incident.id} /><input className="h-8 flex-1 rounded-lg border px-2 text-xs" name="resolution" required placeholder="Resolution" /><button name="status" value="RESOLVED" className="rounded-lg border px-2 text-xs">Resolve</button></form> : null}</div>)}
                  </div>
                  <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-red-700">Report incident</summary><form action={reportTourIncidentAction} className="mt-3 grid gap-3 rounded-xl bg-red-50 p-4 sm:grid-cols-2"><input type="hidden" name="tourId" value={tour.id} /><label className="text-xs">Title<input className={input} name="title" required /></label><label className="text-xs">Severity<select className={input} name="severity" defaultValue="MEDIUM"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label className="text-xs">Occurred at<input className={input} name="occurredAt" type="datetime-local" required defaultValue={nowLocal} /></label><label className="text-xs">Location<input className={input} name="location" /></label><label className="text-xs sm:col-span-2">People involved<input className={input} name="peopleInvolved" /></label><label className="text-xs sm:col-span-2">Description<textarea className={area} name="description" required /></label><button className="h-10 rounded-xl bg-red-700 px-3 text-xs font-semibold text-white sm:col-span-2">Report incident</button></form></details>
                </section>

                <section>
                  <h3 className="font-semibold">Operational documents</h3>
                  <form action={generateOperationalDocumentAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><input type="hidden" name="tourId" value={tour.id} /><select className="h-10 rounded-xl border px-3 text-xs" name="documentType" defaultValue="FULL_OPERATIONS_PACK"><option>FULL_OPERATIONS_PACK</option><option>GUIDE_BRIEF</option><option>ROOMING_LIST</option><option>SUPPLIER_VOUCHER</option><option>VEHICLE_ALLOCATION</option><option>DAILY_OPERATIONS_SHEET</option></select><button className="h-10 rounded-xl bg-[#123d32] px-3 text-xs font-semibold text-white">Generate frozen PDF</button></form>
                  <div className="mt-3 space-y-2">{tour.operationalDocuments.map((document) => <a key={document.id} href={`/api/operations/documents/${document.id}/pdf`} className="flex items-center justify-between rounded-xl border p-3 text-xs"><span><strong>{document.reference}</strong>  -  {document.title}<span className="ml-2 text-[#7b8580]">{document.createdAt.toLocaleString("en-UG")}</span></span><FileDown className="size-4 text-[#176b55]" /></a>)}</div>
                </section>
              </div>
            </div>
          </article>
        ))}
        {!data.tours.length ? <div className="rounded-2xl border bg-white p-10 text-center"><UsersRound className="mx-auto size-8 text-[#176b55]" /><p className="mt-4 font-semibold">No confirmed tours need operations yet.</p><p className="mt-2 text-sm text-[#7b8580]">Accept a quotation and confirm its booking first.</p></div> : null}
      </section>
    </div>
  );
}
