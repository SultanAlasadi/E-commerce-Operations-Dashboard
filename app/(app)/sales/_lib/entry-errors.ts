import type { BusinessDate } from "@/lib/dates";

export const ENTRY_FIELDS = ["platformId", "businessDate", "orders", "amount"] as const;
export type EntryField = (typeof ENTRY_FIELDS)[number];

export function recordHref(platformId: string, businessDate: BusinessDate): string {
  return `/sales/${platformId}/${businessDate}`;
}

export function historyHref(platformId: string, businessDate: BusinessDate): string {
  return `${recordHref(platformId, businessDate)}/history`;
}

export type EntryOutcome =
  /** The day already has a record: open it for correction instead. */
  | { type: "open-existing"; href: string }
  | { type: "errors"; fieldErrors: Partial<Record<EntryField, string>>; formError?: string };

type Failure = { error: string; message: string; details?: Record<string, unknown> };

/**
 * Maps a failed add to what the form shows. A duplicate date opens the existing
 * record (PLAN §2); members who can't view sales get an explanation instead.
 */
export function entryOutcome(
  failure: Failure,
  input: { platformId: string; businessDate: BusinessDate },
  canViewRecord: boolean,
): EntryOutcome {
  switch (failure.error) {
    case "DUPLICATE":
      if (canViewRecord) {
        return {
          type: "open-existing",
          href: `${recordHref(input.platformId, input.businessDate)}?from=duplicate`,
        };
      }
      return {
        type: "errors",
        fieldErrors: {
          businessDate:
            "An entry already exists for this platform and date. Ask someone with Edit sales to correct it.",
        },
      };
    case "FUTURE_DATE":
    case "BEFORE_TRACKING_START":
      return { type: "errors", fieldErrors: { businessDate: failure.message } };
    case "PLATFORM_ARCHIVED":
    case "PLATFORM_NOT_FOUND":
      return { type: "errors", fieldErrors: { platformId: failure.message } };
    case "INVALID": {
      const raw = (failure.details?.fieldErrors ?? {}) as Record<string, string>;
      const fieldErrors: Partial<Record<EntryField, string>> = {};
      let formError: string | undefined;
      for (const [key, message] of Object.entries(raw)) {
        if ((ENTRY_FIELDS as readonly string[]).includes(key)) {
          fieldErrors[key as EntryField] = message;
        } else {
          formError ??= message;
        }
      }
      return { type: "errors", fieldErrors, formError: formError ?? failure.message };
    }
    default:
      return { type: "errors", fieldErrors: {}, formError: failure.message };
  }
}
