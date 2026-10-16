import { z } from "zod";
import { isBusinessDate } from "@/lib/dates";

/**
 * Shape rules shared by the sales forms and the server. Rules that need context
 * (the workspace's "today", the platform's tracking start, archive state) are
 * checked in lib/server/sales.ts.
 */

// Decimal(14,2): up to 12 integer digits and 2 decimals. Kept as a string so the
// value never passes through a JS float.
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

export const businessDateSchema = z
  .string()
  .refine(isBusinessDate, { message: "Enter a valid date." });

export const ordersSchema = z
  .number({ message: "Enter a whole number of orders." })
  .int({ message: "Enter a whole number of orders." })
  .min(0, { message: "Orders cannot be negative." })
  .max(2_147_483_647, { message: "Orders is too large." });

export const amountSchema = z
  .string()
  .trim()
  .regex(AMOUNT, { message: "Enter an amount of 0 or more with at most 2 decimals." });

const figuresSchema = z.object({
  orders: ordersSchema,
  amount: amountSchema,
});

function amountRequiresOrders(value: { orders: number; amount: string }) {
  return !(value.orders === 0 && Number(value.amount) > 0);
}

const amountRequiresOrdersIssue = {
  message: "A positive amount needs at least one order.",
  path: ["orders"],
};

export const dailySalesInputSchema = figuresSchema
  .extend({
    platformId: z.uuid({ message: "Choose a platform." }),
    businessDate: businessDateSchema,
  })
  .refine(amountRequiresOrders, amountRequiresOrdersIssue);

export const dailySalesCorrectionSchema = figuresSchema
  .extend({
    reason: z.string().trim().max(500).optional(),
  })
  .refine(amountRequiresOrders, amountRequiresOrdersIssue);

export type DailySalesInput = z.infer<typeof dailySalesInputSchema>;
export type DailySalesCorrection = z.infer<typeof dailySalesCorrectionSchema>;
