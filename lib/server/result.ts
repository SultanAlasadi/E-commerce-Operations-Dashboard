import { Prisma } from "@/generated/prisma/client";

/** Expected business outcomes are returned, not thrown, so Server Actions can map them to UI states. */
export type Result<T, E extends string = string> =
  | { ok: true; value: T }
  | { ok: false; error: E; message: string; details?: Record<string, unknown> };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function fail<E extends string>(
  error: E,
  message: string,
  details?: Record<string, unknown>,
): Result<never, E> {
  return { ok: false, error, message, details };
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
