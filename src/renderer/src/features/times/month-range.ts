import type { ServiceRecord } from "@shared/domain/models";
import { monthName } from "@shared/lib/format";
import { zonedParts } from "@shared/lib/zoned-time";

/** "2026-09" of the month a record belongs to, in the church's zone. */
export function recordMonth(record: Pick<ServiceRecord, "date">, timeZone: string): string {
  const { year, month } = zonedParts(new Date(record.date), timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const name = monthName(month!);
  return `${name.charAt(0).toLocaleUpperCase("es")}${name.slice(1)} ${year}`;
}

/** Months that have records, oldest first. */
export function monthOptions(
  records: Pick<ServiceRecord, "date">[],
  timeZone: string,
): { value: string; label: string }[] {
  return [...new Set(records.map((record) => recordMonth(record, timeZone)))]
    .sort()
    .map((value) => ({ value, label: monthLabel(value) }));
}

const isMonth = (value: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Records from the `from` month to the `to` month, both included; either may be empty. */
export function filterByMonths<T extends Pick<ServiceRecord, "date">>(
  records: T[],
  from: string,
  to: string,
  timeZone: string,
): T[] {
  let start = isMonth(from) ? from : "";
  let end = isMonth(to) ? to : "";
  if (start && end && start > end) [start, end] = [end, start];
  return records.filter((record) => {
    const month = recordMonth(record, timeZone);
    return (!start || month >= start) && (!end || month <= end);
  });
}
