import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

type Snapshot = {
  generatedAt: string;
  tour: {
    reference: string;
    name: string;
    startDate: string;
    endDate: string;
    customer: { fullName: string; phone?: string | null; email?: string | null };
    notes?: string | null;
  };
  booking: {
    reference: string;
    status: string;
    travellers: Array<{
      isLead: boolean;
      fullName: string;
      nationality?: string | null;
      passportNumber?: string | null;
      dietaryRequirements?: string | null;
      medicalNotes?: string | null;
    }>;
  };
  assignments: Array<{
    type: string;
    resource: string;
    startDate: string;
    endDate: string;
    notes?: string | null;
  }>;
  confirmations: Array<{
    supplier: string;
    service: string;
    serviceDate?: string | null;
    status: string;
    externalReference?: string | null;
    phone?: string | null;
    email?: string | null;
  }>;
  tasks: Array<{
    title: string;
    status: string;
    mandatory: boolean;
    dueDate?: string | null;
  }>;
  itinerary: Array<{
    dayNumber: number;
    date?: string | null;
    title: string;
    startLocation?: string | null;
    endLocation?: string | null;
    supplierNotes?: string | null;
    items: Array<{
      startTime?: string | null;
      endTime?: string | null;
      title: string;
    }>;
  }>;
};

function wrap(font: PDFFont, text: string, size: number, width: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const { id } = await context.params;
  const document = await prisma.operationalDocument.findUnique({
    where: { id },
    select: {
      reference: true,
      title: true,
      fileName: true,
      snapshot: true,
      generatedBy: { select: { fullName: true } },
      createdAt: true,
    },
  });
  if (!document) {
    return NextResponse.json({ error: "Operational document not found." }, { status: 404 });
  }
  const snapshot = document.snapshot as unknown as Snapshot;
  if (!snapshot?.tour?.reference || !Array.isArray(snapshot.itinerary)) {
    return NextResponse.json({ error: "Invalid document snapshot." }, { status: 422 });
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 595;
  const height = 842;
  const margin = 48;
  let page!: PDFPage;
  let y!: number;

  const addPage = () => {
    page = pdf.addPage([width, height]);
    page.drawText("HINENI TOUR OPERATIONS", {
      x: margin,
      y: height - 42,
      size: 9,
      font: bold,
      color: rgb(0.07, 0.24, 0.2),
    });
    page.drawText(document.reference, {
      x: width - margin - regular.widthOfTextAtSize(document.reference, 8),
      y: height - 42,
      size: 8,
      font: regular,
      color: rgb(0.4, 0.45, 0.42),
    });
    y = height - 70;
  };
  const ensure = (heightNeeded: number) => {
    if (y - heightNeeded < 45) addPage();
  };
  const heading = (text: string) => {
    ensure(28);
    y -= 8;
    page.drawText(text, {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.09, 0.42, 0.33),
    });
    y -= 20;
  };
  const line = (text: string, options: { bold?: boolean; indent?: number } = {}) => {
    const size = 9;
    const font = options.bold ? bold : regular;
    const indent = options.indent ?? 0;
    const lines = wrap(font, text, size, width - margin * 2 - indent);
    ensure(lines.length * 13 + 3);
    for (const value of lines) {
      page.drawText(value, {
        x: margin + indent,
        y,
        size,
        font,
        color: rgb(0.16, 0.19, 0.18),
      });
      y -= 13;
    }
    y -= 2;
  };

  addPage();
  page.drawText(document.title, {
    x: margin,
    y,
    size: 22,
    font: bold,
    color: rgb(0.07, 0.24, 0.2),
  });
  y -= 29;
  line(`${snapshot.tour.reference} · ${snapshot.tour.name}`, { bold: true });
  line(
    `${new Date(snapshot.tour.startDate).toLocaleDateString("en-UG")} – ${new Date(snapshot.tour.endDate).toLocaleDateString("en-UG")} · ${snapshot.booking.reference}`,
  );
  line(`Customer: ${snapshot.tour.customer.fullName}`);

  heading("Travellers");
  snapshot.booking.travellers.forEach((traveller, index) => {
    line(
      `${index + 1}. ${traveller.fullName}${traveller.isLead ? " (lead)" : ""} · ${traveller.nationality ?? "Nationality not recorded"} · ${traveller.passportNumber ?? "Document not recorded"}`,
    );
    if (traveller.dietaryRequirements) line(`Dietary: ${traveller.dietaryRequirements}`, { indent: 14 });
    if (traveller.medicalNotes) line(`Medical: ${traveller.medicalNotes}`, { indent: 14 });
  });

  heading("Resource allocation");
  snapshot.assignments.forEach((assignment) => {
    line(`${assignment.type}: ${assignment.resource}`, { bold: true });
    line(
      `${new Date(assignment.startDate).toLocaleDateString("en-UG")} – ${new Date(assignment.endDate).toLocaleDateString("en-UG")}${assignment.notes ? ` · ${assignment.notes}` : ""}`,
      { indent: 14 },
    );
  });

  heading("Supplier confirmations");
  snapshot.confirmations.forEach((confirmation) => {
    line(
      `${confirmation.supplier} · ${confirmation.service} · ${confirmation.status}${confirmation.externalReference ? ` · ${confirmation.externalReference}` : ""}`,
      { bold: true },
    );
    line(
      `${confirmation.serviceDate ? new Date(confirmation.serviceDate).toLocaleDateString("en-UG") : "Date not set"}${confirmation.phone ? ` · ${confirmation.phone}` : ""}${confirmation.email ? ` · ${confirmation.email}` : ""}`,
      { indent: 14 },
    );
  });

  heading("Operational checklist");
  snapshot.tasks.forEach((task) => {
    line(
      `${["COMPLETED", "WAIVED"].includes(task.status) ? "✓" : "○"} ${task.title} · ${task.status.toLowerCase().replaceAll("_", " ")}${task.mandatory ? " · required" : ""}`,
    );
  });

  heading("Daily itinerary and instructions");
  snapshot.itinerary.forEach((day) => {
    line(
      `Day ${day.dayNumber}: ${day.title}${day.date ? ` · ${new Date(day.date).toLocaleDateString("en-UG")}` : ""}`,
      { bold: true },
    );
    if (day.startLocation || day.endLocation) {
      line(`${day.startLocation ?? "Start"} → ${day.endLocation ?? "End"}`, { indent: 14 });
    }
    day.items.forEach((item) =>
      line(
        `${item.startTime ?? ""}${item.endTime ? `–${item.endTime}` : ""} ${item.title}`.trim(),
        { indent: 14 },
      ),
    );
    if (day.supplierNotes) line(`Supplier: ${day.supplierNotes}`, { indent: 14 });
    y -= 5;
  });

  ensure(55);
  y -= 10;
  line(
    `Frozen operational snapshot generated ${document.createdAt.toLocaleString("en-UG")} by ${document.generatedBy.fullName}.`,
  );

  pdf.setTitle(`${document.reference} ${document.title}`);
  pdf.setAuthor("Hineni Tour Operations");
  pdf.setCreationDate(document.createdAt);
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${document.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
