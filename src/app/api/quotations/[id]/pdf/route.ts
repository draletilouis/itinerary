import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { drawPdfBrand, loadPdfBranding } from "@/server/branding/pdf";
import { getCurrentUser } from "@/server/auth/session";
import { formatMoney } from "@/lib/utils";
import { getTravellerPricingRows } from "@/modules/quotations/services/presentation";

export const dynamic = "force-dynamic";

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const requestedVersionValue = new URL(request.url).searchParams.get("version");
  const requestedVersion = requestedVersionValue ? Number(requestedVersionValue) : null;
  const versionFilter =
    requestedVersion !== null &&
    Number.isInteger(requestedVersion) &&
    requestedVersion > 0
      ? { versionNumber: requestedVersion }
      : undefined;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    select: {
      reference: true,
      currentVersionNumber: true,
      customer: { select: { fullName: true } },
      tour: {
        select: {
          name: true,
          startDate: true,
          endDate: true,
          adults: true,
          children: true,
        },
      },
      versions: {
        where: versionFilter,
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          versionNumber: true,
          title: true,
          issueDate: true,
          validUntil: true,
          currencyCode: true,
          subtotal: true,
          tax: true,
          discount: true,
          total: true,
          presentationMode: true,
          adultUnitPrice: true,
          childUnitPrice: true,
          travellerAdjustment: true,
          customerNotes: true,
          terms: true,
          lines: { orderBy: { sortOrder: "asc" }, select: { description: true, details: true, total: true } },
          itineraryVersion: {
            select: {
              introduction: true,
              days: {
                orderBy: { dayNumber: "asc" },
                select: {
                  dayNumber: true,
                  date: true,
                  title: true,
                  clientNarrative: true,
                  items: {
                    orderBy: { sortOrder: "asc" },
                    select: { startTime: true, title: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const version = quotation?.versions[0];
  if (!quotation || !version) {
    return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
  }
  const showItemized = version.presentationMode !== "PER_TRAVELLER";
  const showPerTraveller = version.presentationMode !== "ITEMIZED";
  const travellerRows = getTravellerPricingRows({
      total: version.total,
    adults: quotation.tour.adults,
    children: quotation.tour.children,
    adultUnitPrice: version.adultUnitPrice,
    childUnitPrice: version.childUnitPrice,
    adjustment: version.travellerAdjustment,
  });

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const branding = await loadPdfBranding(pdf);
  const green = rgb(0.07, 0.3, 0.24);
  const gold = rgb(0.86, 0.64, 0.36);
  const grey = rgb(0.35, 0.4, 0.37);
  const width = 595;
  const height = 842;
  const margin = 48;
  let page: PDFPage = pdf.addPage([width, height]);
  let y = height - 48;

  const newPage = () => {
    page = pdf.addPage([width, height]);
    y = height - 48;
  };
  const ensure = (space: number) => {
    if (y - space < 48) newPage();
  };
  const drawWrapped = (text: string, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const size = options.size ?? 10;
    const selectedFont = options.font ?? regular;
    const indent = options.indent ?? 0;
    const lines = wrapText(text || "", selectedFont, size, width - margin * 2 - indent);
    ensure(lines.length * (size + 4) + 8);
    for (const line of lines) {
      page.drawText(line, { x: margin + indent, y, size, font: selectedFont, color: options.color ?? grey });
      y -= size + 4;
    }
    y -= options.gap ?? 4;
  };

  page.drawRectangle({ x: 0, y: height - 170, width, height: 170, color: green });
  drawPdfBrand({ page, branding, font: bold, x: margin, y: height - 65, maxWidth: 130, maxHeight: 28, color: gold });
  page.drawText(version.title, { x: margin, y: height - 100, size: 24, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Prepared for ${quotation.customer.fullName}`, { x: margin, y: height - 128, size: 11, font: regular, color: rgb(0.78, 0.86, 0.82) });
  y = height - 205;
  drawWrapped(`Quotation: ${quotation.reference}-V${version.versionNumber}`, { font: bold, color: green });
  drawWrapped(`Travel dates: ${quotation.tour.startDate.toLocaleDateString("en-UG")} to ${quotation.tour.endDate.toLocaleDateString("en-UG")}  |  Guests: ${quotation.tour.adults + quotation.tour.children}`, { gap: 12 });

  if (showItemized) {
    page.drawText("Price by itinerary item", { x: margin, y, size: 16, font: bold, color: green });
    y -= 26;
    for (const line of version.lines) {
      ensure(54);
      page.drawText(line.description, { x: margin, y, size: 10, font: bold, color: rgb(0.1, 0.13, 0.12) });
      const amount = line.total.isZero() ? "Included" : formatMoney(line.total.toString(), version.currencyCode);
      page.drawText(amount, { x: width - margin - 120, y, size: 10, font: bold, color: line.total.isZero() ? grey : green });
      y -= 15;
      if (line.details) drawWrapped(line.details, { size: 8, gap: 7 });
    }
  }

  if (showPerTraveller) {
    ensure(44);
    page.drawText("Price per traveller", { x: margin, y, size: 16, font: bold, color: green });
    y -= 26;
    for (const row of travellerRows) {
      ensure(38);
      page.drawText(row.label, { x: margin, y, size: 10, font: bold, color: rgb(0.1, 0.13, 0.12) });
      page.drawText(formatMoney(row.total.toString(), version.currencyCode), { x: width - margin - 120, y, size: 10, font: bold, color: green });
      y -= 15;
      const detail = `${row.quantity} x ${formatMoney(row.unitPrice.toString(), version.currencyCode)}${row.adjustment.isZero() ? "" : ` plus ${formatMoney(row.adjustment.toString(), version.currencyCode)} rounding balance`}`;
      drawWrapped(detail, { size: 8, gap: 7 });
    }
  }

  ensure(34);
  y -= 4;
  page.drawText("Quotation total", { x: width - margin - 230, y, size: 12, font: bold, color: green });
  page.drawText(formatMoney(version.total.toString(), version.currencyCode), { x: width - margin - 120, y, size: 12, font: bold, color: green });
  y -= 34;
  if (version.itineraryVersion) {
    ensure(50);
    page.drawText("Day-by-day itinerary", { x: margin, y, size: 16, font: bold, color: green });
    y -= 28;
    if (version.itineraryVersion.introduction) drawWrapped(version.itineraryVersion.introduction, { gap: 14 });
    for (const day of version.itineraryVersion.days) {
      ensure(70);
      page.drawText(`DAY ${day.dayNumber}${day.date ? `  |  ${day.date.toLocaleDateString("en-UG")}` : ""}`, { x: margin, y, size: 8, font: bold, color: gold });
      y -= 17;
      drawWrapped(day.title, { size: 12, font: bold, color: rgb(0.1, 0.13, 0.12), gap: 3 });
      if (day.clientNarrative) drawWrapped(day.clientNarrative, { size: 9, gap: 5 });
      for (const item of day.items) drawWrapped(`${item.startTime ? `${item.startTime} - ` : ""}${item.title}`, { size: 8, indent: 10, gap: 1 });
      y -= 8;
    }
  }

  if (version.customerNotes) {
    ensure(50);
    page.drawText("Notes", { x: margin, y, size: 13, font: bold, color: green });
    y -= 20;
    drawWrapped(version.customerNotes, { size: 9, gap: 10 });
  }
  if (version.terms) {
    ensure(50);
    page.drawText("Terms and conditions", { x: margin, y, size: 13, font: bold, color: green });
    y -= 20;
    drawWrapped(version.terms, { size: 8 });
  }

  for (const pdfPage of pdf.getPages()) {
    pdfPage.drawText(`${quotation.reference}-V${version.versionNumber}  |  Valid until ${version.validUntil.toLocaleDateString("en-UG")}`, { x: margin, y: 25, size: 7, font: regular, color: rgb(0.5, 0.53, 0.51) });
  }
  pdf.setTitle(`${quotation.reference} - ${version.title}`);
  pdf.setAuthor(branding.name);
  const bytes = await pdf.save();
  return new Response(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quotation.reference}-V${version.versionNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
