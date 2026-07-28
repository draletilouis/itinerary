"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { saveAttachment } from "@/server/storage/postgres";
import { writeAuditEvent } from "@/server/audit/service";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const recordTypes = [
  "TOUR",
  "BOOKING",
  "CUSTOMER",
  "TRAVELLER",
  "SUPPLIER",
  "VEHICLE",
  "DRIVER",
  "GUIDE",
] as const;

async function recordExists(recordType: (typeof recordTypes)[number], id: string) {
  switch (recordType) {
    case "TOUR":
      return Boolean(await prisma.tour.findUnique({ where: { id }, select: { id: true } }));
    case "BOOKING":
      return Boolean(await prisma.booking.findUnique({ where: { id }, select: { id: true } }));
    case "CUSTOMER":
      return Boolean(await prisma.customer.findUnique({ where: { id }, select: { id: true } }));
    case "TRAVELLER":
      return Boolean(await prisma.traveller.findUnique({ where: { id }, select: { id: true } }));
    case "SUPPLIER":
      return Boolean(await prisma.supplier.findUnique({ where: { id }, select: { id: true } }));
    case "VEHICLE":
      return Boolean(await prisma.vehicle.findUnique({ where: { id }, select: { id: true } }));
    case "DRIVER":
      return Boolean(await prisma.driver.findUnique({ where: { id }, select: { id: true } }));
    case "GUIDE":
      return Boolean(await prisma.guide.findUnique({ where: { id }, select: { id: true } }));
  }
}

export async function uploadDocumentAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const data = z
    .object({
      recordToken: z.string().min(1),
      documentType: z.string().trim().min(2).max(80),
      notes: z.string().trim().optional().default(""),
      expiresAt: z.string().trim().optional().default(""),
    })
    .parse(Object.fromEntries(formData));
  const [rawType, recordId, extra] = data.recordToken.split(":");
  const recordType = z.enum(recordTypes).parse(rawType);
  if (!recordId || extra || !z.string().uuid().safeParse(recordId).success) {
    throw new Error("Select a valid document record.");
  }
  if (!(await recordExists(recordType, recordId))) {
    throw new Error("The selected record no longer exists.");
  }
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Select a document.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Documents are limited to 10 MB.");
  const expiresAt = data.expiresAt
    ? new Date(`${data.expiresAt}T00:00:00.000Z`)
    : undefined;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error("Select a valid expiry date.");
  }
  const safeName = file.name.replace(/[\\/\0\r\n]/g, "_").slice(0, 255);
  const attachment = await saveAttachment({
    recordType,
    recordId,
    documentType: data.documentType,
    fileName: safeName,
    mimeType: file.type,
    content: new Uint8Array(await file.arrayBuffer()),
    uploadedById: actor.id,
    notes: data.notes || undefined,
    expiresAt,
  });
  await writeAuditEvent(prisma, {
    actorId: actor.id,
    action: "document.uploaded",
    entityType: "Attachment",
    entityId: attachment.id,
    next: {
      recordType,
      recordId,
      documentType: data.documentType,
      fileName: safeName,
      fileSize: attachment.fileSize,
      expiresAt: expiresAt?.toISOString(),
    },
  });

  revalidatePath("/documents");
  revalidatePath("/operations");
}
