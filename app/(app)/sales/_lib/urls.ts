import type { Period } from "./periods";

export type ListParams = {
  period: Period;
  date?: string;
  from?: string;
  to?: string;
  platform?: string;
  /** Calendar month, YYYY-MM. */
  cal?: string;
};

/** The sales list URL; empty values are left out. */
export function salesListHref(params: ListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return `/sales?${query.toString()}`;
}
