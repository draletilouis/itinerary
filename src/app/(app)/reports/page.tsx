import {
  ArrowDownToLine,
  Banknote,
  BarChart3,
  CircleDollarSign,
  Landmark,
  ReceiptText,
  TriangleAlert,
} from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { getReportsWorkspace } from "@/modules/reports/queries/reports";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const data = await getReportsWorkspace();
  const money = (value: { toString(): string }) =>
    formatMoney(value.toString(), data.reportingCurrency);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#176b55]">
            Phase 11 · Management reporting
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68736e]">
            Operational and financial reporting consolidated into{" "}
            <strong>{data.reportingCurrency}</strong> using effective direct or
            inverse exchange rates.
          </p>
        </div>
        <a href="/api/reports/finance.csv" className="flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold">
          <ArrowDownToLine className="size-4" /> Export finance CSV
        </a>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          [CircleDollarSign, "Net allocated revenue", money(data.metrics.netRevenue)],
          [Banknote, "Receivables", money(data.metrics.receivables)],
          [Landmark, "Supplier payables", money(data.metrics.payables)],
          [ReceiptText, "Recorded expenses", money(data.metrics.expenses)],
          [BarChart3, "Actual profit", money(data.metrics.actualProfit)],
        ].map(([Icon, label, value]) => {
          const CardIcon = Icon as typeof BarChart3;
          return <article key={String(label)} className="rounded-2xl border bg-white p-5"><CardIcon className="size-5 text-[#176b55]" /><p className="mt-4 text-xs text-[#7b8580]">{String(label)}</p><p className="mt-2 text-xl font-semibold">{String(value)}</p></article>;
        })}
      </section>

      {data.metrics.unresolvedConversions ? (
        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            {data.metrics.unresolvedConversions} reporting conversion
            {data.metrics.unresolvedConversions === 1 ? "" : "s"} could not be
            resolved. Those values are excluded rather than converted using an
            invented rate. Add the missing effective exchange rates in Settings.
          </p>
        </div>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b px-5 py-4"><h2 className="font-semibold">Enquiry pipeline</h2></div>
          <div className="grid grid-cols-2 gap-px bg-[#eceeea] sm:grid-cols-3">{data.enquiryPipeline.map((entry) => <div key={entry.status} className="bg-white p-4"><p className="text-xs capitalize text-[#7b8580]">{entry.status.toLowerCase().replaceAll("_"," ")}</p><p className="mt-2 text-2xl font-semibold">{entry.count}</p></div>)}</div>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b px-5 py-4"><h2 className="font-semibold">Booking statuses</h2></div>
          <div className="grid grid-cols-2 gap-px bg-[#eceeea] sm:grid-cols-3">{data.bookingStatuses.map((entry) => <div key={entry.status} className="bg-white p-4"><p className="text-xs capitalize text-[#7b8580]">{entry.status.toLowerCase().replaceAll("_"," ")}</p><p className="mt-2 text-2xl font-semibold">{entry.count}</p></div>)}</div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Tour profitability</h2><p className="mt-1 text-xs text-[#7b8580]">Original costing values remain visible beside consolidated reporting values.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-[#f8f8f5] text-xs uppercase text-[#7b8580]"><tr><th className="px-5 py-3">Tour</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Original revenue</th><th className="px-5 py-3">Original cost</th><th className="px-5 py-3">Reporting profit</th><th className="px-5 py-3">Margin</th></tr></thead><tbody className="divide-y">{data.tourProfitability.map((tour) => <tr key={tour.id}><td className="px-5 py-4"><p className="font-semibold">{tour.reference}</p><p className="text-xs text-[#7b8580]">{tour.name}</p></td><td className="px-5 py-4 capitalize">{tour.status.toLowerCase().replaceAll("_"," ")}</td><td className="px-5 py-4">{formatMoney(tour.actualRevenue.toString(),tour.costingCurrencyCode)}</td><td className="px-5 py-4">{formatMoney(tour.actualCost.toString(),tour.costingCurrencyCode)}</td><td className="px-5 py-4 font-semibold">{tour.reportingProfit ? money(tour.reportingProfit) : "Rate missing"}</td><td className="px-5 py-4">{tour.actualMargin.toString()}%</td></tr>)}{!data.tourProfitability.length ? <tr><td colSpan={6} className="px-5 py-10 text-center text-[#7b8580]">No tours to report.</td></tr> : null}</tbody></table></div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b px-5 py-4"><h2 className="font-semibold">Outstanding customer invoices</h2></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#f8f8f5] text-xs uppercase text-[#7b8580]"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Balance</th></tr></thead><tbody className="divide-y">{data.invoices.filter((invoice) => invoice.balanceDue.isPositive()).map((invoice) => <tr key={invoice.reference}><td className="px-5 py-4 font-semibold">{invoice.reference}</td><td className="px-5 py-4">{invoice.customer.fullName}</td><td className="px-5 py-4">{invoice.dueDate.toLocaleDateString("en-UG")}</td><td className="px-5 py-4">{formatMoney(invoice.balanceDue.toString(),invoice.currencyCode)}</td></tr>)}</tbody></table></div>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b px-5 py-4"><h2 className="font-semibold">Outstanding supplier bills</h2></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#f8f8f5] text-xs uppercase text-[#7b8580]"><tr><th className="px-5 py-3">Bill</th><th className="px-5 py-3">Supplier</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Balance</th></tr></thead><tbody className="divide-y">{data.supplierBills.map((bill) => <tr key={bill.reference}><td className="px-5 py-4 font-semibold">{bill.reference}</td><td className="px-5 py-4">{bill.supplier.name}</td><td className="px-5 py-4">{bill.dueDate.toLocaleDateString("en-UG")}</td><td className="px-5 py-4">{formatMoney(bill.balanceDue.toString(),bill.currencyCode)}</td></tr>)}</tbody></table></div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Resource utilisation</h2><div className="mt-4 space-y-2">{data.resourceUtilisation.map((entry) => <div key={`${entry.resourceType}-${entry.status}`} className="flex items-center justify-between rounded-xl bg-[#f8f8f5] p-3 text-sm"><span className="capitalize">{entry.resourceType.toLowerCase()} · {entry.status.toLowerCase()}</span><strong>{entry.count}</strong></div>)}</div></div>
        <div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Incident summary</h2><div className="mt-4 space-y-2">{data.incidentSummary.map((entry) => <div key={`${entry.severity}-${entry.status}`} className="flex items-center justify-between rounded-xl bg-[#f8f8f5] p-3 text-sm"><span className="capitalize">{entry.severity.toLowerCase()} · {entry.status.toLowerCase()}</span><strong>{entry.count}</strong></div>)}</div></div>
      </section>

      <p className="mt-8 text-xs text-[#7b8580]">
        As of {data.asOf.toLocaleString("en-UG")}. Financial records remain
        immutable in their original currencies; this report performs a separate,
        traceable consolidation.
      </p>
    </div>
  );
}
