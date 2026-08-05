import type { PDFDocument, PDFFont, PDFImage, PDFPage, RGB } from "pdf-lib";
import { prisma } from "@/server/db/prisma";

type PdfBranding = {
  name: string;
  logo: PDFImage | null;
};

export async function loadPdfBranding(pdf: PDFDocument): Promise<PdfBranding> {
  const profile = await prisma.companyProfile.findUnique({
    where: { singletonKey: "primary" },
    select: { name: true, logoUrl: true },
  });
  const name = profile?.name || "Hineni Tour Operations";
  const attachmentId = profile?.logoUrl?.match(/^\/api\/attachments\/([0-9a-f-]+)$/i)?.[1];
  if (!attachmentId) return { name, logo: null };

  const attachment = await prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      recordType: "CompanyProfile",
      documentType: "COMPANY_LOGO",
    },
    select: { content: true, mimeType: true },
  });
  if (!attachment) return { name, logo: null };

  try {
    const bytes = Uint8Array.from(attachment.content);
    const logo = attachment.mimeType === "image/png"
      ? await pdf.embedPng(bytes)
      : attachment.mimeType === "image/jpeg"
        ? await pdf.embedJpg(bytes)
        : null;
    return { name, logo };
  } catch {
    return { name, logo: null };
  }
}

export function drawPdfBrand(input: {
  page: PDFPage;
  branding: PdfBranding;
  font: PDFFont;
  x: number;
  y: number;
  maxWidth?: number;
  maxHeight?: number;
  size?: number;
  color: RGB;
}) {
  const { page, branding, font, x, y, color } = input;
  if (branding.logo) {
    const dimensions = branding.logo.scaleToFit(input.maxWidth ?? 120, input.maxHeight ?? 46);
    page.drawImage(branding.logo, {
      x,
      y: y - dimensions.height + 8,
      width: dimensions.width,
      height: dimensions.height,
    });
    return;
  }
  page.drawText(branding.name.toUpperCase(), {
    x,
    y,
    size: input.size ?? 10,
    font,
    color,
  });
}
