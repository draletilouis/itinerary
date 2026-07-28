import { z } from "zod";

const optionalText = z.string().trim().optional().default("");

export const enquirySchema = z.object({
  customerId: z.string().uuid(),
  source: z.string().trim().min(2, "Enquiry source is required."),
  proposedStartDate: optionalText,
  proposedEndDate: optionalText,
  flexibleDates: z.string().optional().transform((value) => value === "on"),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().nonnegative(),
  childAges: optionalText,
  rooms: z.union([z.literal(""), z.coerce.number().int().positive()]),
  destinationsOfInterest: optionalText,
  arrivalLocation: optionalText,
  departureLocation: optionalText,
  customerBudget: optionalText.refine(
    (value) => !value || /^\d+(\.\d+)?$/.test(value),
    "Enter a valid budget.",
  ),
  budgetCurrencyCode: optionalText,
  accommodationPreference: optionalText,
  activityInterests: optionalText,
  transportPreference: optionalText,
  dietaryRequirements: optionalText,
  accessibilityRequirements: optionalText,
  specialRequests: optionalText,
  notes: optionalText,
  followUpAt: optionalText,
});

export const communicationSchema = z.object({
  enquiryId: z.string().uuid(),
  channel: z.string().trim().min(2),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  subject: optionalText,
  content: z.string().trim().min(2, "Enter a communication note."),
  occurredAt: optionalText,
});

export const followUpSchema = z.object({
  enquiryId: z.string().uuid(),
  scheduledFor: z.string().min(1, "Select a follow-up date and time."),
  notes: optionalText,
  assignedToId: optionalText,
});
