import Link from "next/link";
import { BedDouble, Building2, Plus, Tags } from "lucide-react";
import {
  addSupplierRateAction,
  createSupplierAction,
  createSupplierCategoryAction,
  updateSupplierAction,
} from "@/modules/catalogue/actions/catalogue";
import { getCatalogue } from "@/modules/catalogue/queries/catalogue";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Suppliers" };
export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm";

export default async function SuppliersPage() {
  const data = await getCatalogue();
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#011478]">Commercial partners</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Suppliers</h1>
      <p className="mt-3 text-sm text-[#4b5563]">Define your own supplier categories, classify every supplier, and keep effective-dated service rates.</p>

      <section className="mt-7 rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2"><Tags className="size-4 text-[#011478]" /><h2 className="font-semibold">Supplier categories</h2></div>
        <p className="mt-2 text-xs text-[#6b7280]">Categories are configured here and are never fixed in the application.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.supplierCategories.map((category) => <span key={category.id} className="rounded-full bg-[#eff3ff] px-3 py-1.5 text-xs text-[#011478]">{category.name} / {category._count.suppliers}</span>)}
          {!data.supplierCategories.length ? <span className="text-sm text-[#6b7280]">Create a category before adding suppliers.</span> : null}
        </div>
        <form action={createSupplierCategoryAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <input className={input} name="name" required placeholder="Category name, e.g. Accommodation" />
          <input className={input} name="description" placeholder="What suppliers in this category provide" />
          <button className="mt-2 h-10 rounded-lg border px-4 text-sm font-semibold">Add category</button>
        </form>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="grid content-start gap-4 sm:grid-cols-2">
          {data.suppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-xl border bg-white p-5">
              <div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-lg bg-[#eff3ff] text-[#011478]"><Building2 className="size-5" /></span><span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px]">{supplier.status.toLowerCase()}</span></div>
              <h2 className="mt-4 font-semibold">{supplier.name}</h2>
              <p className="mt-1 text-xs text-[#6b7280]">{supplier.reference} / {supplier.category.name}</p>
              <p className="mt-4 text-sm text-[#4b5563]">{supplier.contactPerson ?? "No contact person"}{supplier.phone ? ` · ${supplier.phone}` : ""}</p>
              <p className="mt-3 text-xs text-[#6b7280]">{supplier._count.activities} activities / {supplier._count.accommodations} properties / {supplier.rates.length} general rates</p>
              {supplier.rates.length ? <div className="mt-4 space-y-2 border-t pt-4">{supplier.rates.slice(0, 3).map((rate) => <div key={rate.id} className="flex items-start justify-between gap-3 text-xs"><div><p className="font-medium">{rate.service}</p><p className="text-[#6b7280]">per {rate.unit} / from {rate.startDate.toLocaleDateString("en-UG")}</p></div><span className="font-semibold text-[#011478]">{formatMoney(rate.amount.toString(), rate.currencyCode)}</span></div>)}</div> : null}
              {data.accommodations.filter((property) => property.supplierId === supplier.id).length ? (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs font-semibold"><BedDouble className="size-4 text-[#011478]" /> Accommodation rooms</p>
                    <Link href="/settings/catalogue" className="text-[11px] font-semibold text-[#011478]">Manage rooms and rates</Link>
                  </div>
                  <div className="mt-3 space-y-3">
                    {data.accommodations.filter((property) => property.supplierId === supplier.id).map((property) => (
                      <div key={property.id} className="rounded-lg bg-[#f8faf9] p-3">
                        <p className="text-xs font-semibold">{property.name}</p>
                        <div className="mt-2 space-y-2">
                          {property.roomTypes.map((room) => {
                            const rates = property.rates.filter((rate) => rate.roomTypeId === room.id);
                            return (
                              <div key={room.id} className="text-[11px] text-[#4b5563]">
                                <p><span className="font-medium">{room.name}</span> · maximum {room.maximumOccupancy} guests</p>
                                {rates.length ? rates.map((rate) => (
                                  <p key={rate.id} className="mt-1 text-[#011478]">
                                    {formatMoney(rate.amount.toString(), rate.currencyCode)} per room/night · {rate.occupancyGuests} guest(s) · {rate.mealPlan}
                                  </p>
                                )) : <p className="mt-1 text-amber-700">No structured room rate yet</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <details className="mt-4 border-t pt-4">
                <summary className="cursor-pointer text-xs font-semibold text-[#011478]">Edit supplier</summary>
                <form action={updateSupplierAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <label className="text-[11px] sm:col-span-2">Supplier name<input className={input} name="name" required defaultValue={supplier.name} /></label>
                  <label className="text-[11px]">Category<select className={input} name="categoryId" required defaultValue={supplier.categoryId}>{data.supplierCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                  <label className="text-[11px]">Status<select className={input} name="status" defaultValue={supplier.status}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select></label>
                  <label className="text-[11px]">Contact person<input className={input} name="contactPerson" defaultValue={supplier.contactPerson ?? ""} /></label>
                  <label className="text-[11px]">Phone<input className={input} name="phone" defaultValue={supplier.phone ?? ""} /></label>
                  <label className="text-[11px]">Email<input className={input} name="email" type="email" defaultValue={supplier.email ?? ""} /></label>
                  <label className="text-[11px]">Preferred currency<select className={input} name="preferredCurrencyCode" defaultValue={supplier.preferredCurrencyCode ?? ""}><option value="">Not set</option>{data.currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select></label>
                  <label className="text-[11px] sm:col-span-2">Address<input className={input} name="address" defaultValue={supplier.address ?? ""} /></label>
                  <label className="text-[11px]">Tax identifier<input className={input} name="taxIdentifier" defaultValue={supplier.taxIdentifier ?? ""} /></label>
                  <label className="text-[11px]">Payment terms<input className={input} name="paymentTerms" defaultValue={supplier.paymentTerms ?? ""} /></label>
                  <label className="text-[11px]">Contract starts<input className={input} name="contractStart" type="date" defaultValue={supplier.contractStart?.toISOString().slice(0, 10) ?? ""} /></label>
                  <label className="text-[11px]">Contract ends<input className={input} name="contractEnd" type="date" defaultValue={supplier.contractEnd?.toISOString().slice(0, 10) ?? ""} /></label>
                  <label className="text-[11px] sm:col-span-2">Bank details<textarea className="mt-2 min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-sm" name="bankDetails" defaultValue={supplier.bankDetails ?? ""} /></label>
                  <label className="text-[11px] sm:col-span-2">Notes<textarea className="mt-2 min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-sm" name="notes" defaultValue={supplier.notes ?? ""} /></label>
                  <button className="h-10 rounded-lg bg-[#011478] px-4 text-xs font-semibold text-white sm:col-span-2">Save supplier changes</button>
                </form>
              </details>
              <details className="mt-4 border-t pt-4">
                <summary className="cursor-pointer text-xs font-semibold text-[#011478]">Add general service rate</summary>
                {data.accommodations.some((property) => property.supplierId === supplier.id) ? (
                  <p className="mt-2 text-[11px] text-amber-700">
                    Room rates must be recorded under Manage rooms and rates so room occupancy is captured.
                  </p>
                ) : null}
                <form action={addSupplierRateAction} className="mt-3 grid gap-3">
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <input className={input} name="service" required placeholder="Service, e.g. airport transfer" />
                  <input className={input} name="unit" required placeholder="Unit, e.g. vehicle / day / person" />
                  <div className="grid grid-cols-2 gap-2"><input className={input} name="amount" inputMode="decimal" required placeholder="Amount" /><select className={input} name="currencyCode">{data.currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-[11px]">Valid from<input className={input} name="startDate" type="date" required /></label><label className="text-[11px]">Valid until<input className={input} name="endDate" type="date" /></label></div>
                  <input className={input} name="notes" placeholder="Rate notes" />
                  <button className="h-10 rounded-lg border px-4 text-xs font-semibold">Save rate</button>
                </form>
              </details>
            </article>
          ))}
          {!data.suppliers.length ? <p className="rounded-xl border border-dashed p-10 text-center text-sm text-[#6b7280]">No suppliers yet.</p> : null}
        </section>
        <section className="h-fit rounded-xl border bg-white p-5">
          <div className="flex items-center gap-2"><Plus className="size-4 text-[#011478]" /><h2 className="font-semibold">New supplier</h2></div>
          <form action={createSupplierAction} className="mt-5 space-y-3">
            <label className="block text-xs">Name<input className={input} name="name" required /></label>
            <label className="block text-xs">Category<select className={input} name="categoryId" required defaultValue=""><option value="" disabled>Select category</option>{data.supplierCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="block text-xs">Contact person<input className={input} name="contactPerson" /></label>
            <label className="block text-xs">Phone<input className={input} name="phone" /></label>
            <label className="block text-xs">Email<input className={input} name="email" type="email" /></label>
            <label className="block text-xs">Preferred currency<select className={input} name="preferredCurrencyCode"><option value="">Not set</option>{data.currencies.map((item) => <option key={item.code}>{item.code}</option>)}</select></label>
            <label className="block text-xs">Payment terms<input className={input} name="paymentTerms" /></label>
            <button disabled={!data.supplierCategories.length} className="h-10 w-full rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white disabled:opacity-50">Create supplier</button>
          </form>
        </section>
      </div>
    </div>
  );
}