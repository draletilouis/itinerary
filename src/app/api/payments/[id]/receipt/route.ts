import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getCurrentUser } from "@/server/auth/session";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const payment = await prisma.customerPayment.findUnique({
    where: { id },
    select: {
      receiptReference: true,
      paymentDate: true,
      paymentCurrencyCode: true,
      originalAmount: true,
      bookingCurrencyCode: true,
      exchangeRate: true,
      bookingCurrencyAmount: true,
      method: true,
      externalReference: true,
      status: true,
      customer: { select: { fullName: true } },
      booking: { select: { reference: true, tour: { select: { name: true } } } },
      allocations: {
        where: { reversedAt: null },
        select: {
          invoiceCurrencyAmount: true,
          invoice: { select: { reference: true } },
        },
      },
      refunds: {
        where: { status: "RECORDED" },
        select: { reference: true, bookingCurrencyAmount: true },
      },
    },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.07, 0.3, 0.24);
  const grey = rgb(0.35, 0.4, 0.37);
  page.drawRectangle({ x: 0, y: 690, width: 595, height: 152, color: green });
  page.drawText("HINENI TOUR OPERATIONS", { x: 48, y: 790, size: 10, font: bold, color: rgb(0.86, 0.64, 0.36) });
  page.drawText("PAYMENT RECEIPT", { x: 48, y: 748, size: 26, font: bold, color: rgb(1, 1, 1) });
  page.drawText(payment.receiptReference, { x: 420, y: 750, size: 10, font: bold, color: rgb(1, 1, 1) });
  let y = 650;
  const rows = [
    ["Received from", payment.customer.fullName],
    ["Booking", `${payment.booking.reference} · ${payment.booking.tour.name}`],
    ["Payment date", payment.paymentDate.toLocaleDateString("en-UG")],
    ["Method", payment.method],
    ["External reference", payment.externalReference ?? "—"],
    ["Amount received", formatMoney(payment.originalAmount.toString(), payment.paymentCurrencyCode)],
    ["Exchange rate", `${payment.exchangeRate.toString()} ${payment.bookingCurrencyCode} per ${payment.paymentCurrencyCode}`],
    ["Booking value", formatMoney(payment.bookingCurrencyAmount.toString(), payment.bookingCurrencyCode)],
    ["Status", payment.status.toLowerCase()],
  ];
  for (const [label, value] of rows) {
    page.drawText(label, { x: 48, y, size: 9, font: regular, color: grey });
    page.drawText(value.slice(0, 72), { x: 190, y, size: 9, font: bold, color: green });
    y -= 27;
  }
  y -= 8;
  page.drawText("Allocations", { x: 48, y, size: 12, font: bold, color: green });
  y -= 24;
  for (const allocation of payment.allocations) {
    page.drawText(allocation.invoice.reference, { x: 48, y, size: 9, font: regular, color: grey });
    page.drawText(formatMoney(allocation.invoiceCurrencyAmount.toString(), payment.bookingCurrencyCode), { x: 410, y, size: 9, font: bold, color: grey });
    y -= 22;
  }
  for (const refund of payment.refunds) {
    page.drawText(`Refund ${refund.reference}`, { x: 48, y, size: 9, font: regular, color: rgb(0.7, 0.15, 0.15) });
    page.drawText(`-${formatMoney(refund.bookingCurrencyAmount.toString(), payment.bookingCurrencyCode)}`, { x: 410, y, size: 9, font: bold, color: rgb(0.7, 0.15, 0.15) });
    y -= 22;
  }
  page.drawText("This receipt records the payment in its original currency and the preserved booking conversion rate.", { x: 48, y: 35, size: 7, font: regular, color: grey });
  pdf.setTitle(payment.receiptReference);
  pdf.setAuthor("Hineni Tour Operations");
  const bytes = await pdf.save();
  return new Response(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${payment.receiptReference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
