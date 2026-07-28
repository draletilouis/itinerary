import { z } from "zod";

const optionalText = z.string().trim().optional().default("");

export const customerSchema = z.object({
  type: z.enum([
    "INDIVIDUAL",
    "FAMILY",
    "GROUP",
    "CORPORATE",
    "SCHOOL",
    "ORGANISATION",
    "TRAVEL_AGENCY",
    "TOUR_OPERATOR",
  ]),
  fullName: z.string().trim().min(2, "Customer name is required."),
  organisation: optionalText,
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().min(5, "Phone number is required."),
  alternativePhone: optionalText,
  country: optionalText,
  nationality: optionalText,
  address: optionalText,
  preferredCommunicationMethod: optionalText,
  travelPreferences: optionalText,
  dietaryRequirements: optionalText,
  accessibilityRequirements: optionalText,
  specialRequests: optionalText,
  emergencyContact: optionalText,
  notes: optionalText,
  tags: optionalText,
});

export const travellerSchema = z.object({
  customerId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Traveller name is required."),
  dateOfBirth: optionalText,
  nationality: optionalText,
  passportNumber: optionalText,
  passportExpiry: optionalText,
  visaStatus: optionalText,
  dietaryNeeds: optionalText,
  accessibilityNote: optionalText,
  roomPreference: optionalText,
  emergencyContact: optionalText,
  relationship: optionalText,
});
