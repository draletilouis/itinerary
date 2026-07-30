import { Prisma } from "@prisma/client";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  FileText,
  ReceiptText,
  Undo2,
  WalletCards,
} from "lucide-react";
import { formatMoney } from "@/lib/utils";
import {
  allocateCustomerPaymentAction,
  createAdditionalInvoiceAction,
  recordCustomerPaymentAction,
  recordRefundAction,
  reverseCustomerPaymentAction,
} from "@/modules/finance/actions/finance";
import {
  createSupplierBillAction,
  recordSupplierPaymentAction,
  recordTourExpenseAction,
  reverseTourExpenseAction,
} from "@/modules/finance/actions/supplier-finance";
import { getFinanceWorkspace } from "@/modules/finance/queries/finance";

export const metadata = { title: "Finance" };
export const dynamic = "force-dynamic";
const input = "mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm";
const today = new Date().toISOString().slice(0, 10);

export default async function FinancePage() {
  const data = await getFinanceWorkspace();

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#011478]">
        Financial control
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Finance</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4b5563]">
        Customer invoices, multi-currency receipts, allocations, refunds, supplier
        balances, and actual tour expenses.
      </p>
      <Link href="/reports" className="mt-5 inline-flex h-10 items-center rounded-lg border bg-white px-4 text-sm font-semibold">Open reports</Link>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [FileText, "Open customer invoices", data.metrics.openInvoices],
          [ReceiptText, "Recorded payments", data.metrics.recordedPayments],
          [Banknote, "Open supplier bills", data.metrics.openSupplierBills],
          [WalletCards, "Recorded expenses", data.metrics.recordedExpenses],
        ].map(([Icon, label, value]) => {
          const CardIcon = Icon as typeof FileText;
          return (
            <article key={String(label)} className="rounded-xl border bg-white p-5">
              <CardIcon className="size-5 text-[#011478]" />
              <p className="mt-4 text-xs text-[#6b7280]">{String(label)}</p>
              <p className="mt-2 text-2xl font-semibold">{String(value)}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <details className="rounded-xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Record customer payment
          </summary>
          <form action={recordCustomerPaymentAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <label className="text-xs sm:col-span-2">
              Booking
              <select className={input} name="bookingId" required defaultValue="">
                <option value="" disabled>Select booking</option>
                {data.bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.reference} · {booking.customer.fullName} · {booking.currencyCode} {booking.balanceDue.toString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">Payment date<input className={input} name="paymentDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">Payment currency<select className={input} name="paymentCurrencyCode" required defaultValue="USD">{data.currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select></label>
            <label className="text-xs">Amount received<input className={input} name="originalAmount" required /></label>
            <label className="text-xs">Rate to booking currency<input className={input} name="exchangeRate" required defaultValue="1" /></label>
            <label className="text-xs">Rate date<input className={input} name="exchangeRateDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">Method<input className={input} name="method" required placeholder="Bank transfer, cash, card" /></label>
            <label className="text-xs">External reference<input className={input} name="externalReference" /></label>
            <label className="text-xs">Notes<input className={input} name="notes" /></label>
            <button className="h-10 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white sm:col-span-2">Record payment</button>
          </form>
        </details>

        <details className="rounded-xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Issue additional-service invoice
          </summary>
          <form action={createAdditionalInvoiceAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <label className="text-xs sm:col-span-2">Booking<select className={input} name="bookingId" required defaultValue=""><option value="" disabled>Select booking</option>{data.bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.reference} · {booking.tour.name}</option>)}</select></label>
            <label className="text-xs sm:col-span-2">Description<input className={input} name="description" required /></label>
            <label className="text-xs">Subtotal<input className={input} name="subtotal" required /></label>
            <label className="text-xs">Tax<input className={input} name="tax" required defaultValue="0" /></label>
            <label className="text-xs">Due date<input className={input} name="dueDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">Notes<input className={input} name="notes" /></label>
            <button className="h-10 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white sm:col-span-2">Issue invoice</button>
          </form>
        </details>

        <details className="rounded-xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Record supplier bill</summary>
          <form action={createSupplierBillAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <label className="text-xs">Supplier<select className={input} name="supplierId" required defaultValue=""><option value="" disabled>Select supplier</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label className="text-xs">Tour<select className={input} name="tourId" defaultValue=""><option value="">Not tour-specific</option>{data.tours.map((tour) => <option key={tour.id} value={tour.id}>{tour.reference} · {tour.name}</option>)}</select></label>
            <label className="text-xs">Supplier reference<input className={input} name="supplierRef" /></label>
            <label className="text-xs">Currency<select className={input} name="currencyCode" required defaultValue="USD">{data.currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select></label>
            <label className="text-xs">Issue date<input className={input} name="issueDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">Due date<input className={input} name="dueDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">Total<input className={input} name="total" required /></label>
            <label className="text-xs">Notes<input className={input} name="notes" /></label>
            <button className="h-10 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white sm:col-span-2">Record supplier bill</button>
          </form>
        </details>

        <details className="rounded-xl border bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Record tour expense</summary>
          <form action={recordTourExpenseAction} className="grid gap-4 border-t p-5 sm:grid-cols-2">
            <label className="text-xs sm:col-span-2">Tour<select className={input} name="tourId" required defaultValue=""><option value="" disabled>Select tour</option>{data.tours.map((tour) => <option key={tour.id} value={tour.id}>{tour.reference} · {tour.name} · costing {tour.costingCurrencyCode}</option>)}</select></label>
            <label className="text-xs">Supplier<select className={input} name="supplierId" defaultValue=""><option value="">No supplier</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label className="text-xs">Supplier bill<select className={input} name="supplierBillId" defaultValue=""><option value="">No linked bill</option>{data.supplierBills.map((bill) => <option key={bill.id} value={bill.id}>{bill.reference} · {bill.supplier.name}</option>)}</select></label>
            <label className="text-xs">Category<input className={input} name="category" required placeholder="Accommodation, transport, activity" /></label>
            <label className="text-xs">Description<input className={input} name="description" required /></label>
            <label className="text-xs">Expense date<input className={input} name="expenseDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">Original currency<select className={input} name="originalCurrencyCode" required defaultValue="USD">{data.currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select></label>
            <label className="text-xs">Original amount<input className={input} name="originalAmount" required /></label>
            <label className="text-xs">Rate to tour costing currency<input className={input} name="exchangeRate" required defaultValue="1" /></label>
            <label className="text-xs">Rate date<input className={input} name="exchangeRateDate" type="date" required defaultValue={today} /></label>
            <label className="text-xs">Receipt reference<input className={input} name="receiptReference" /></label>
            <label className="text-xs sm:col-span-2">Notes<input className={input} name="notes" /></label>
            <button className="h-10 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white sm:col-span-2">Record expense</button>
          </form>
        </details>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Customer invoices</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f9fafb] text-xs uppercase text-[#6b7280]"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Booking</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Balance</th><th className="px-5 py-3">Status</th><th /></tr></thead><tbody className="divide-y">{data.invoices.map((invoice) => <tr key={invoice.id}><td className="px-5 py-4 font-semibold">{invoice.reference}</td><td className="px-5 py-4">{invoice.customer.fullName}</td><td className="px-5 py-4">{invoice.booking.reference}</td><td className="px-5 py-4">{invoice.dueDate.toLocaleDateString("en-UG")}</td><td className="px-5 py-4">{formatMoney(invoice.total.toString(),invoice.currencyCode)}</td><td className="px-5 py-4 font-semibold">{formatMoney(invoice.balanceDue.toString(),invoice.currencyCode)}</td><td className="px-5 py-4 capitalize">{invoice.status.toLowerCase().replaceAll("_"," ")}</td><td className="px-5 py-4"><a href={`/api/invoices/${invoice.id}/pdf`} aria-label={`Download ${invoice.reference}`}><ArrowRight className="size-4 text-[#011478]" /></a></td></tr>)}{!data.invoices.length ? <tr><td colSpan={8} className="px-5 py-10 text-center text-[#6b7280]">No invoices yet.</td></tr> : null}</tbody></table></div>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="font-semibold">Customer payments and allocations</h2>
        {data.payments.map((payment) => {
          const allocated = payment.allocations.reduce(
            (sum, entry) => sum.plus(entry.invoiceCurrencyAmount),
            new Prisma.Decimal(0),
          );
          const available = payment.bookingCurrencyAmount.minus(allocated);
          return <article key={payment.id} className="rounded-xl border bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{payment.receiptReference} · {payment.customer.fullName}</p><p className="mt-1 text-xs text-[#6b7280]">{formatMoney(payment.originalAmount.toString(),payment.paymentCurrencyCode)} at {payment.exchangeRate.toString()} = {formatMoney(payment.bookingCurrencyAmount.toString(),payment.bookingCurrencyCode)} · {payment.method}</p></div><div className="flex gap-2"><a href={`/api/payments/${payment.id}/receipt`} className="rounded-lg border px-3 py-2 text-xs font-semibold">Receipt PDF</a><span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs capitalize">{payment.status.toLowerCase()}</span></div></div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-lg bg-[#f9fafb] p-4 text-sm"><p className="text-xs text-[#6b7280]">Allocations</p>{payment.allocations.map((allocation) => <div key={allocation.id} className="mt-2 flex justify-between"><span>{allocation.invoice.reference}</span><span className="font-semibold">{formatMoney(allocation.invoiceCurrencyAmount.toString(),payment.bookingCurrencyCode)}</span></div>)}<p className="mt-3 border-t pt-3 text-xs">Unallocated: {formatMoney(Prisma.Decimal.max(available, 0).toString(),payment.bookingCurrencyCode)}</p></div>
              {payment.status === "RECORDED" ? <div className="space-y-3"><form action={allocateCustomerPaymentAction} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"><input type="hidden" name="paymentId" value={payment.id} /><select className="h-10 rounded-lg border px-3 text-xs" name="invoiceId" required defaultValue=""><option value="" disabled>Select invoice</option>{payment.booking.invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.reference} · {invoice.currencyCode} {invoice.balanceDue.toString()}</option>)}</select><input className="h-10 rounded-lg border px-3 text-xs" name="invoiceCurrencyAmount" required placeholder="Amount" /><button className="h-10 rounded-lg bg-[#011478] px-3 text-xs font-semibold text-white">Allocate</button></form><form action={reverseCustomerPaymentAction} className="flex gap-2"><input type="hidden" name="paymentId" value={payment.id} /><input className="h-10 flex-1 rounded-lg border px-3 text-xs" name="reason" required placeholder="Reversal reason" /><button className="flex h-10 items-center gap-1 rounded-lg border px-3 text-xs text-red-700"><Undo2 className="size-3" /> Reverse</button></form></div> : null}
            </div>
            {payment.allocations.length ? <details className="mt-4"><summary className="cursor-pointer text-xs font-semibold text-[#011478]">Record refund</summary><form action={recordRefundAction} className="mt-3 grid gap-3 sm:grid-cols-4"><select className="h-10 rounded-lg border px-3 text-xs" name="allocationId" required defaultValue=""><option value="" disabled>Select allocation</option>{payment.allocations.map((allocation) => <option key={allocation.id} value={allocation.id}>{allocation.invoice.reference} · {allocation.invoiceCurrencyAmount.toString()}</option>)}</select><input className="h-10 rounded-lg border px-3 text-xs" name="refundDate" type="date" required defaultValue={today} /><input className="h-10 rounded-lg border px-3 text-xs" name="bookingCurrencyAmount" required placeholder="Refund amount" /><input className="h-10 rounded-lg border px-3 text-xs" name="reason" required placeholder="Reason" /><button className="h-10 rounded-lg border px-3 text-xs font-semibold sm:col-span-4">Record refund</button></form></details> : null}
          </article>;
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-3"><h2 className="font-semibold">Supplier bills</h2>{data.supplierBills.map((bill) => <article key={bill.id} className="rounded-xl border bg-white p-5"><div className="flex justify-between gap-4"><div><p className="font-semibold">{bill.reference} · {bill.supplier.name}</p><p className="mt-1 text-xs text-[#6b7280]">{bill.tour?.name ?? "General"} · due {bill.dueDate.toLocaleDateString("en-UG")}</p></div><div className="text-right"><p className="font-semibold">{formatMoney(bill.balanceDue.toString(),bill.currencyCode)}</p><p className="text-xs capitalize text-[#6b7280]">{bill.status.toLowerCase().replaceAll("_"," ")}</p></div></div>{!["PAID","CANCELLED"].includes(bill.status) ? <details className="mt-4"><summary className="cursor-pointer text-xs font-semibold text-[#011478]">Record supplier payment</summary><form action={recordSupplierPaymentAction} className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="billId" value={bill.id} /><input className="h-10 rounded-lg border px-3 text-xs" name="paymentDate" type="date" required defaultValue={today} /><select className="h-10 rounded-lg border px-3 text-xs" name="paymentCurrencyCode" required defaultValue={bill.currencyCode}>{data.currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select><input className="h-10 rounded-lg border px-3 text-xs" name="originalAmount" required placeholder="Amount paid" /><input className="h-10 rounded-lg border px-3 text-xs" name="exchangeRate" required defaultValue="1" placeholder="Rate to bill currency" /><input className="h-10 rounded-lg border px-3 text-xs" name="exchangeRateDate" type="date" required defaultValue={today} /><input className="h-10 rounded-lg border px-3 text-xs" name="method" required placeholder="Method" /><input className="h-10 rounded-lg border px-3 text-xs" name="externalReference" placeholder="Reference" /><input className="h-10 rounded-lg border px-3 text-xs" name="notes" placeholder="Notes" /><button className="h-10 rounded-lg bg-[#011478] px-3 text-xs font-semibold text-white sm:col-span-2">Record payment</button></form></details> : null}</article>)}</div>
        <div className="space-y-3"><h2 className="font-semibold">Tour expenses</h2>{data.expenses.map((expense) => <article key={expense.id} className="rounded-xl border bg-white p-5"><div className="flex justify-between gap-4"><div><p className="font-semibold">{expense.reference} · {expense.description}</p><p className="mt-1 text-xs text-[#6b7280]">{expense.tour.reference} · {expense.category} · {expense.supplier?.name ?? "No supplier"}</p></div><div className="text-right"><p className="font-semibold">{formatMoney(expense.convertedAmount.toString(),expense.costingCurrencyCode)}</p><p className="text-xs text-[#6b7280]">{formatMoney(expense.originalAmount.toString(),expense.originalCurrencyCode)} at {expense.exchangeRate.toString()}</p></div></div>{expense.status === "RECORDED" ? <form action={reverseTourExpenseAction} className="mt-4 flex gap-2"><input type="hidden" name="expenseId" value={expense.id} /><input className="h-10 flex-1 rounded-lg border px-3 text-xs" name="reason" required placeholder="Reversal reason" /><button className="flex h-10 items-center gap-1 rounded-lg border px-3 text-xs text-red-700"><Undo2 className="size-3" /> Reverse</button></form> : <p className="mt-3 text-xs text-red-700">Reversed</p>}</article>)}</div>
      </section>

      <p className="mt-8 text-xs text-[#6b7280]">
        Values remain in their transaction currencies. Consolidated reporting-currency
        conversion belongs to the reporting phase.
      </p>
    </div>
  );
}
