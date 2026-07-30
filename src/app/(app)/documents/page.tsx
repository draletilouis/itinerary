import { FileCheck2, FileUp, ShieldCheck } from "lucide-react";
import { uploadDocumentAction } from "@/modules/documents/actions/documents";
import { prisma } from "@/server/db/prisma";

export const metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [tours, bookings, customers, travellers, suppliers, vehicles, drivers, guides, attachments] = await Promise.all([
    prisma.tour.findMany({ select: { id: true, reference: true, name: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.booking.findMany({ select: { id: true, reference: true, tour: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.customer.findMany({ select: { id: true, reference: true, fullName: true }, orderBy: { fullName: "asc" }, take: 200 }),
    prisma.traveller.findMany({ select: { id: true, fullName: true, customer: { select: { fullName: true } } }, orderBy: { fullName: "asc" }, take: 300 }),
    prisma.supplier.findMany({ select: { id: true, reference: true, name: true }, orderBy: { name: "asc" }, take: 200 }),
    prisma.vehicle.findMany({ select: { id: true, reference: true, registration: true }, orderBy: { registration: "asc" } }),
    prisma.driver.findMany({ select: { id: true, reference: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.guide.findMany({ select: { id: true, reference: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.attachment.findMany({ include: { uploadedBy: { select: { fullName: true } } }, orderBy: { createdAt: "desc" }, take: 250 }),
  ]);
  const groups = [
    ["Tours", tours.map((entry) => ({ token: `TOUR:${entry.id}`, label: `${entry.reference} · ${entry.name}` }))],
    ["Bookings", bookings.map((entry) => ({ token: `BOOKING:${entry.id}`, label: `${entry.reference} · ${entry.tour.name}` }))],
    ["Customers", customers.map((entry) => ({ token: `CUSTOMER:${entry.id}`, label: `${entry.reference} · ${entry.fullName}` }))],
    ["Travellers", travellers.map((entry) => ({ token: `TRAVELLER:${entry.id}`, label: `${entry.fullName} · ${entry.customer.fullName}` }))],
    ["Suppliers", suppliers.map((entry) => ({ token: `SUPPLIER:${entry.id}`, label: `${entry.reference} · ${entry.name}` }))],
    ["Vehicles", vehicles.map((entry) => ({ token: `VEHICLE:${entry.id}`, label: `${entry.reference} · ${entry.registration}` }))],
    ["Drivers", drivers.map((entry) => ({ token: `DRIVER:${entry.id}`, label: `${entry.reference} · ${entry.fullName}` }))],
    ["Guides", guides.map((entry) => ({ token: `GUIDE:${entry.id}`, label: `${entry.reference} · ${entry.fullName}` }))],
  ] as const;
  const input = "mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#011478]">PostgreSQL document control</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Documents</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4b5563]">Secure record-linked documents stored directly in PostgreSQL with authenticated downloads, size/type controls, optional expiry, and audit evidence.</p>

      <section className="mt-7 rounded-xl border bg-white">
        <div className="flex items-center gap-3 border-b px-5 py-4"><FileUp className="size-5 text-[#011478]" /><h2 className="font-semibold">Upload document</h2></div>
        <form action={uploadDocumentAction} className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="text-xs sm:col-span-2">Linked record<select className={input} name="recordToken" required defaultValue=""><option value="" disabled>Select record</option>{groups.map(([label, options]) => <optgroup key={label} label={label}>{options.map((option) => <option key={option.token} value={option.token}>{option.label}</option>)}</optgroup>)}</select></label>
          <label className="text-xs">Document type<input className={input} name="documentType" required placeholder="Passport, voucher, contract, certification" /></label>
          <label className="text-xs">Expiry date<input className={input} name="expiresAt" type="date" /></label>
          <label className="text-xs sm:col-span-2">File<input className="mt-2 block w-full rounded-lg border bg-[#f9fafb] p-3 text-sm" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" required /></label>
          <label className="text-xs sm:col-span-2">Notes<input className={input} name="notes" /></label>
          <button className="h-10 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white sm:col-span-2">Upload securely</button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border bg-white">
        <div className="flex items-center gap-3 border-b px-5 py-4"><FileCheck2 className="size-5 text-[#011478]" /><div><h2 className="font-semibold">Document register</h2><p className="text-xs text-[#6b7280]">{attachments.length} latest records</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f9fafb] text-xs uppercase text-[#6b7280]"><tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Linked record</th><th className="px-5 py-3">Size</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">Uploaded</th></tr></thead><tbody className="divide-y">{attachments.map((attachment) => <tr key={attachment.id}><td className="px-5 py-4"><a href={`/api/attachments/${attachment.id}`} className="font-semibold text-[#011478]">{attachment.fileName}</a><p className="text-xs text-[#6b7280]">{attachment.documentType}</p></td><td className="px-5 py-4">{attachment.recordType} · <span className="font-mono text-xs">{attachment.recordId}</span></td><td className="px-5 py-4">{(attachment.fileSize / 1024).toFixed(1)} KB</td><td className="px-5 py-4">{attachment.expiresAt?.toLocaleDateString("en-UG") ?? "No expiry"}</td><td className="px-5 py-4">{attachment.createdAt.toLocaleString("en-UG")}<p className="text-xs text-[#6b7280]">{attachment.uploadedBy.fullName}</p></td></tr>)}{!attachments.length ? <tr><td colSpan={5} className="px-5 py-10 text-center text-[#6b7280]">No documents uploaded.</td></tr> : null}</tbody></table></div>
      </section>
      <p className="mt-6 flex items-center gap-2 text-xs text-[#6b7280]"><ShieldCheck className="size-4 text-[#011478]" />There is no destructive delete workflow; corrections create new evidence.</p>
    </div>
  );
}
