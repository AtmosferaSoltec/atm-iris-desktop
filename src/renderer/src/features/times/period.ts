import type { Period } from "@shared/domain/time-statistics";

/** URL (`period`, `month` = "2026-09") → Period. A bad month falls back to the default. */
export function periodFromParams(kind: Period["kind"], month: string): Period {
  if (kind !== "month") return { kind };
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const value = match ? { year: Number(match[1]), month: Number(match[2]) } : null;
  if (!value || value.month < 1 || value.month > 12) return { kind: "last3Months" };
  return { kind: "month", ...value };
}
