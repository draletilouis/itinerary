import { Building2, Plus, Tags } from "lucide-react";
import {
  addSupplierRateAction,
  createSupplierAction,
  createSupplierCategoryAction,
} from "@/modules/catalogue/actions/catalogue";
import { getCatalogue } from "@/modules/catalogue/queries/catalogue";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Suppliers" };
export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-xl border bg-white px-3 text-sm";

export default async function SuppliersPage() {
  const data = await getCatalogue();
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">Commercial partners</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Suppliers</h1>
      <p className="mt-3 text-sm text-[#68736e]">Define your own supplier categories, classify every supplier, and keep effective-dated service rates.</p>

      <section className="mt-7 rounded-2xl border bg-white p-5">
        <div className="flex items-center gap-2"><Tags className="size-4 text-[#176b55]" /><h2 className="font-semibold">Supplier categories</h2></div>
        <p className="mt-2 text-xs text-[#7b8580]">Categories are configured here and are never fixed in the application.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.supplierCategories.map((category) => <span key={category.id} className="rounded-full bg-[#edf5f1] px-3 py-1.5 text-xs text-[#176b55]">{category.name} / {category._count.suppliers}</span>)}
          {!data.supplierCategories.length ? <span className="text-sm text-[#7b8580]">Create a category before adding suppliers.</span> : null}
        </div>
        <form action={createSupplierCategoryAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <input className={input} name="name" required placeholder="Category name, e.g. Accommodation" />
          <input className={input} name="description" placeholder="What suppliers in this category provide" />
          <button className="mt-2 h-10 rounded-xl border px-4 text-sm font-semibold">Add category</button>
        </form>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="grid content-start gap-4 sm:grid-cols-2">
          {data.suppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-[#edf5f1] text-[#176b55]"><Building2 className="size-5" /></span><span className="rounded-full bg-[#f1f3ef] px-2.5 py-1 text-[11px]">{supplier.status.toLowerCase()}</span></div>
              <h2 className="mt-4 font-semibold">{supplier.name}</h2>
              <p className="mt-1 text-xs text-[#7b8580]">{supplier.reference} / {supplier.category.name}</p>
              <p className="mt-4 text-sm text-[#59635e]">{supplier.contactPerson ?? "No contact person"}{supplier.phone ? ` · ${supplier.phone}` : ""}</p>
              <p className="mt-3 text-xs text-[#7b8580]">{supplier._count.activities} activities / {supplier._count.accommodations} properties / {supplier.rates.length} general rates</p>
              {supplier.rates.length ? <div className="mt-4 space-y-2 border-t pt-4">{supplier.rates.slice(0, 3).map((rate) => <div key={rate.id} className="flex items-start justify-between gap-3 text-xs"><div><p className="font-medium">{rate.service}</p><p className="text-[#7b8580]">per {rate.unit} / from {rate.startDate.toLocaleDateString("en-UG")}</p></div><span className="font-semibold text-[#176b55]">{formatMoney(rate.amount.toString(), rate.currencyCode)}</span></div>)}</div> : null}
              <details className="mt-4 border-t pt-4">
                <summary className="cursor-pointer text-xs font-semibold text-[#176b55]">Add service rate</summary>
                <form action={addSupplierRateAction} className="mt-3 grid gap-3">
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <input className={input} name="service" required placeholder="Service, e.g. airport transfer" />
                  <input className={input} name="unit" required placeholder="Unit, e.g. vehicle / day / person" />
                  <div className="grid grid-cols-2 gap-2"><input className={input} name="amount" inputMode="decimal" required placeholder="Amount" /><select className={input} name="currencyCode">{data.currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-2"><label className="text-[11px]">Valid from<input className={input} name="startDate" type="date" required /></label><label className="text-[11px]">Valid until<input className={input} name="endDate" type="date" /></label></div>
                  <input className={input} name="notes" placeholder="Rate notes" />
                  <button className="h-10 rounded-xl border px-4 text-xs font-semibold">Save rate</button>
                </form>
              </details>
            </article>
          ))}
          {!data.suppliers.length ? <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-[#7b8580]">No suppliers yet.</p> : null}
        </section>
        <section className="h-fit rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-2"><Plus className="size-4 text-[#176b55]" /><h2 className="font-semibold">New supplier</h2></div>
          <form action={createSupplierAction} className="mt-5 space-y-3">
            <label className="block text-xs">Name<input className={input} name="name" required /></label>
            <label className="block text-xs">Category<select className={input} name="categoryId" required defaultValue=""><option value="" disabled>Select category</option>{data.supplierCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="block text-xs">Contact person<input className={input} name="contactPerson" /></label>
            <label className="block text-xs">Phone<input className={input} name="phone" /></label>
            <label className="block text-xs">Email<input className={input} name="email" type="email" /></label>
            <label className="block text-xs">Preferred currency<select className={input} name="preferredCurrencyCode"><option value="">Not set</option>{data.currencies.map((item) => <option key={item.code}>{item.code}</option>)}</select></label>
            <label className="block text-xs">Payment terms<input className={input} name="paymentTerms" /></label>
            <button disabled={!data.supplierCategories.length} className="h-10 w-full rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white disabled:opacity-50">Create supplier</button>
          </form>
        </section>
      </div>
    </div>
  );
}