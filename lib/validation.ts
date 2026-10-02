import { z } from "zod";
import { normalizeEmail, normalizeIndianPhone } from "@/lib/normalization";

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  age: z.coerce
    .number()
    .int()
    .min(18, "You must be at least 18 years old")
    .max(120, "Enter a valid age"),
  city: z.string().trim().min(2, "Enter your city").max(100),
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(z.email("Enter a valid email address").max(254)),
  phone: z
    .string()
    .transform(normalizeIndianPhone)
    .pipe(z.string().regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian mobile number")),
  consent: z.literal(true, { error: "Consent is required to participate" }),
  turnstileToken: z.string().min(1, "Complete the security check"),
  submissionKey: z.uuid(),
  website: z.string().max(0, "Invalid submission").optional().default(""),
  startedAt: z.coerce.number().int().positive(),
});

export const homeCheckupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  age: z.coerce.number().int().min(18).max(120),
  phone: z
    .string()
    .transform(normalizeIndianPhone)
    .pipe(z.string().regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian mobile number")),
  address: z.string().trim().min(5).max(500),
  homeOwnership: z.enum(["owned", "rented"]),
  yearsInHome: z.coerce.number().min(0).max(120),
  needsCheckup: z.boolean(),
  consent: z.literal(true, { error: "Consent is required" }),
  turnstileToken: z.string().min(1),
  website: z.string().max(0).optional().default(""),
  startedAt: z.coerce.number().int().positive(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a short reason").max(500),
});

export const closeDrawSchema = reasonSchema.extend({
  confirmation: z.literal("CLOSE LUCKY DRAW"),
});

export const claimSchema = z.object({
  status: z.enum(["pending", "claimed", "unclaimed", "rejected"]),
  notes: z.string().trim().max(1000).optional().default(""),
});
