import { z } from "zod";

export const packageItemSchema = z.object({
  type: z.enum(["ACTIVITY", "ACCOMMODATION", "TRANSPORT", "MEAL", "NOTE", "OTHER"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  title: z.string().trim().min(2),
  clientDescription: z.string().optional(),
  activityId: z.string().uuid().optional(),
  accommodationId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
});

export const packageDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().trim().min(2),
  destinationId: z.string().uuid().optional(),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  clientNarrative: z.string().optional(),
  meals: z.array(z.string()),
  transport: z.string().optional(),
  items: z.array(packageItemSchema),
});

export const packageCostSchema = z.object({
  category: z.string().trim().min(2),
  description: z.string().trim().min(2),
  basis: z.enum(["STANDARD", "ACCOMMODATION", "PER_PERSON", "VEHICLE", "OVERRIDE"]),
  unitCost: z.string(),
  quantity: z.string(),
  days: z.string(),
  nights: z.string(),
  rooms: z.string(),
  vehicles: z.string(),
  eligibleTravellers: z.string(),
  taxPercentage: z.string(),
  commissionPercentage: z.string(),
  overrideTotal: z.string().optional(),
  overrideReason: z.string().optional(),
  originalCurrencyCode: z.string().length(3),
  supplierId: z.string().uuid().optional(),
  dayNumber: z.number().int().positive().optional(),
});

export const packageDaysSchema = z.array(packageDaySchema);
export const packageCostsSchema = z.array(packageCostSchema);

export function packageDays(value: unknown) {
  return packageDaysSchema.parse(value);
}

export function packageCosts(value: unknown) {
  return packageCostsSchema.parse(value);
}
