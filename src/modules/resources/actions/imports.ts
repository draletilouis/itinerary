"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUser } from "@/server/auth/session";
import { nextReference } from "@/modules/settings/services/reference-number";
import { writeAuditEvent } from "@/server/audit/service";

const MAX_FILE_BYTES = 512 * 1024;
const MAX_ROWS = 1000;
const requiredHeaders = [
  "registration",
  "make",
  "model",
  "vehicletype",
  "capacity",
  "ownership",
];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      value = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      value += character;
    }
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  return rows;
}

export async function importVehiclesCsvAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Select a CSV file.");
  if (file.size > MAX_FILE_BYTES) throw new Error("CSV files are limited to 512 KB.");
  if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Upload a .csv file.");

  const rows = parseCsv(await file.text());
  if (rows.length < 2) throw new Error("The CSV contains no data rows.");
  if (rows.length - 1 > MAX_ROWS) throw new Error(`Imports are limited to ${MAX_ROWS} rows.`);
  const headers = rows[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim().toLowerCase().replaceAll("_", ""),
  );
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) throw new Error(`Missing required column: ${header}.`);
  }
  const value = (row: string[], key: string) => row[headers.indexOf(key)]?.trim() ?? "";
  const records = rows.slice(1).map((row, index) => {
    const registration = value(row, "registration").toUpperCase();
    const capacity = Number(value(row, "capacity"));
    if (!registration) throw new Error(`Row ${index + 2}: registration is required.`);
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error(`Row ${index + 2}: capacity must be a positive whole number.`);
    }
    const make = value(row, "make");
    const model = value(row, "model");
    const vehicleType = value(row, "vehicletype");
    const ownership = value(row, "ownership").toUpperCase();
    if (!make || !model || !vehicleType || !ownership) {
      throw new Error(`Row ${index + 2}: make, model, vehicleType, and ownership are required.`);
    }
    return {
      registration,
      make,
      model,
      vehicleType,
      capacity,
      ownership,
      colour: value(row, "colour") || null,
      notes: value(row, "notes") || null,
    };
  });
  const registrations = records.map((record) => record.registration);
  if (new Set(registrations).size !== registrations.length) {
    throw new Error("The CSV contains duplicate registrations.");
  }

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.vehicle.findMany({
        where: { registration: { in: registrations } },
        select: { registration: true },
      });
      if (existing.length) {
        throw new Error(
          `Already registered: ${existing.map((entry) => entry.registration).join(", ")}.`,
        );
      }
      for (const record of records) {
        await tx.vehicle.create({
          data: {
            ...record,
            reference: await nextReference(tx, "vehicle", "VEH"),
          },
        });
      }
      await writeAuditEvent(tx, {
        actorId: actor.id,
        action: "resource.vehicle-csv-imported",
        entityType: "VehicleImport",
        entityId: randomUUID(),
        next: {
          fileName: file.name,
          rows: records.length,
          registrations,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  revalidatePath("/resources");
  revalidatePath("/resources/import");
}
