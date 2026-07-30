import Link from "next/link";
import { ArrowRight, Plus, Search, Users } from "lucide-react";
import { listCustomers } from "@/modules/customers/queries/customers";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const customers = await listCustomers(q);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#011478]">
            Guests and clients
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-3 text-sm text-[#4b5563]">
            Contact details, preferences, travellers, enquiries, and tour history.
          </p>
        </div>
        <Link
          href="/customers/new"
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white"
        >
          <Plus className="size-4" /> New customer
        </Link>
      </div>

      <form className="mt-7 flex max-w-xl items-center gap-3 rounded-lg border bg-white px-4">
        <Search className="size-4 text-[#6b7280]" />
        <input
          className="h-12 flex-1 bg-transparent text-sm outline-none"
          name="q"
          defaultValue={q}
          placeholder="Search name, organisation, phone, or reference"
        />
      </form>

      <section className="mt-5 overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
              <tr>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Travellers</th>
                <th className="px-6 py-3 font-medium">Enquiries</th>
                <th className="px-6 py-3 font-medium">Tours</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-[#f9fafb]">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{customer.fullName}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      {customer.reference}
                      {customer.organisation ? ` · ${customer.organisation}` : ""}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p>{customer.phone ?? "—"}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      {customer.email ?? "No email"}
                    </p>
                  </td>
                  <td className="px-6 py-4 capitalize text-[#4b5563]">
                    {customer.type.toLowerCase().replaceAll("_", " ")}
                  </td>
                  <td className="px-6 py-4">{customer._count.travellers}</td>
                  <td className="px-6 py-4">{customer._count.enquiries}</td>
                  <td className="px-6 py-4">{customer._count.tours}</td>
                  <td className="px-6 py-4">
                    <Link href={`/customers/${customer.id}`} aria-label={`Open ${customer.fullName}`}>
                      <ArrowRight className="size-4 text-[#011478]" />
                    </Link>
                  </td>
                </tr>
              ))}
              {!customers.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Users className="mx-auto size-6 text-[#9ca3af]" />
                    <p className="mt-3 font-medium">No customers found</p>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      Create the first customer or adjust the search.
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
