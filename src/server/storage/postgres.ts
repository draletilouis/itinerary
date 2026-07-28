import { prisma } from "@/server/db/prisma";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function saveAttachment(input: {
  recordType: string;
  recordId: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  content: Uint8Array;
  uploadedById: string;
  notes?: string;
  expiresAt?: Date;
}) {
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new Error("This file type is not supported.");
  }
  if (input.content.byteLength === 0) throw new Error("The file is empty.");
  if (input.content.byteLength > MAX_FILE_SIZE) {
    throw new Error("The file is larger than the 10 MB limit.");
  }

  return prisma.attachment.create({
    data: {
      recordType: input.recordType,
      recordId: input.recordId,
      documentType: input.documentType,
      fileName: input.fileName.slice(0, 255),
      mimeType: input.mimeType,
      fileSize: input.content.byteLength,
      content: Uint8Array.from(input.content),
      uploadedById: input.uploadedById,
      notes: input.notes,
      expiresAt: input.expiresAt,
    },
  });
}
