import { z } from "zod";
import { businessDateSchema } from "@/lib/validation/sales";
import { isValidTimeZone } from "@/lib/dates";

const supportedCurrencies = new Set(Intl.supportedValuesOf("currency"));

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(1, { message: "Enter a workspace name." }).max(100),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((code) => supportedCurrencies.has(code), { message: "Choose a valid currency." }),
  timeZone: z
    .string()
    .trim()
    .refine(isValidTimeZone, { message: "Choose a valid IANA time zone." }),
});

export const platformInputSchema = z.object({
  name: z.string().trim().min(1, { message: "Enter a platform name." }).max(100),
  provider: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || null),
  trackingStartDate: businessDateSchema,
});

export type WorkspaceSettingsInput = z.input<typeof workspaceSettingsSchema>;
export type PlatformInput = z.input<typeof platformInputSchema>;
