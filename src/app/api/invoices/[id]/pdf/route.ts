import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { drawPdfBrand, loadPdfBranding } from "@/server/branding/pdf";
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
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      reference: true,
      type: true,
      issueDate: true,
      dueDate: true,
      currencyCode: true,
      subtotal: true,
      tax: true,
      total: true,
      amountPaid: true,
      balanceDue: true,
      notes: true,
      customer: { select: { fullName: true, email: true, phone: true } },
      booking: {
        select: {
          reference: true,
          tour: { select: { name: true, startDate: true, endDate: true } },
        },
      },
      lines: {
        orderBy: { sortOrder: "asc" },
        select: { description: true, quantity: true, unitPrice: true, total: true },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const branding = await loadPdfBranding(pdf);
  const green = rgb(0.07, 0.3, 0.24);
  const grey = rgb(0.35, 0.4, 0.37);
  page.drawRectangle({ x: 0, y: 690, width: 595, height: 152, color: green });
  drawPdfBrand({ page, branding, font: bold, x: 48, y: 790, maxWidth: 130, maxHeight: 28, color: rgb(0.86, 0.64, 0.36) });
  page.drawText("INVOICE", { x: 48, y: 748, size: 28, font: bold, color: rgb(1, 1, 1) });
  page.drawText(invoice.reference, { x: 430, y: 750, size: 11, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Bill to: ${invoice.customer.fullName}`, { x: 48, y: 650, size: 13, font: bold, color: green });
  page.drawText(`Booking: ${invoice.booking.reference} · ${invoice.booking.tour.name}`, { x: 48, y: 628, size: 9, font: regular, color: grey });
  page.drawText(`Issued: ${invoice.issueDate.toLocaleDateString("en-UG")}    Due: ${invoice.dueDate.toLocaleDateString("en-UG")}`, { x: 48, y: 610, size: 9, font: regular, color: grey });
  let y = 565;
  page.drawText("Description", { x: 48, y, size: 9, font: bold, color: green });
  page.drawText("Amount", { x: 455, y, size: 9, font: bold, color: green });
  y -= 24;
  for (const line of invoice.lines) {
    page.drawText(line.description.slice(0, 70), { x: 48, y, size: 9, font: regular, color: grey });
    page.drawText(formatMoney(line.total.toString(), invoice.currencyCode), { x: 430, y, size: 9, font: bold, color: grey });
    y -= 24;
  }
  y -= 12;
  for (const [label, amount] of [
    ["Subtotal", invoice.subtotal],
    ["Tax", invoice.tax],
    ["Total", invoice.total],
    ["Paid", invoice.amountPaid],
    ["Balance due", invoice.balanceDue],
  ] as const) {
    page.drawText(label, { x: 350, y, size: label === "Balance due" ? 12 : 9, font: label === "Balance due" ? bold : regular, color: label === "Balance due" ? green : grey });
    page.drawText(formatMoney(amount.toString(), invoice.currencyCode), { x: 430, y, size: label === "Balance due" ? 12 : 9, font: label === "Balance due" ? bold : regular, color: label === "Balance due" ? green : grey });
    y -= label === "Balance due" ? 30 : 20;
  }
  if (invoice.notes) page.drawText(invoice.notes.slice(0, 100), { x: 48, y: Math.max(y - 20, 80), size: 8, font: regular, color: grey });
  page.drawText(`${invoice.reference} · ${invoice.booking.tour.startDate.toLocaleDateString("en-UG")} to ${invoice.booking.tour.endDate.toLocaleDateString("en-UG")}`, { x: 48, y: 28, size: 7, font: regular, color: grey });
  pdf.setTitle(invoice.reference);
  pdf.setAuthor(branding.name);
  const bytes = await pdf.save();
  return new Response(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
