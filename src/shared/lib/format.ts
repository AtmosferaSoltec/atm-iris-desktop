import type { Schedule } from "@shared/domain/models";
import { plural } from "./text";
import { zonedDayNumber, zonedParts } from "./zoned-time";

// Every date and time is shown in Spanish and, when it is an instant, in the
// church's time zone (IRIS_SPEC §13, contract §2) — never the browser's or the server's.

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const SHORT_WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** 1 = Sunday … 7 = Saturday. */
export function weekdayName(weekday: number): string {
  return WEEKDAYS[weekday - 1] ?? "";
}

export function shortWeekdayName(weekday: number): string {
  return SHORT_WEEKDAYS[weekday - 1] ?? "";
}

/** "10:00", "9:30" (24-hour, as in Spanish). */
export function timeOfDay(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

/** "Domingo · 10:00". */
export function scheduleSummary(schedule: Schedule): string {
  return `${weekdayName(schedule.weekday)} · ${timeOfDay(schedule.hour, schedule.minute)}`;
}

/** "1 h 10 min", "45 min", "2 h". */
export function durationSummary(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "4 bloques · 1 h 10 min". */
export function blocksSummary(count: number, seconds: number): string {
  return `${plural(count, "bloque")} · ${durationSummary(seconds)}`;
}

/** Stopwatch time: "9:40", "1:32:10". Negative values keep their sign. */
export function clock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "−" : "";
  const seconds = Math.round(Math.abs(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0
    ? `${sign}${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${sign}${minutes}:${rest}`;
}

/** "+4:05" for overtime (always with the plus sign). */
export function overtime(seconds: number): string {
  return `+${clock(Math.max(0, seconds))}`;
}

/* ------------------------------------------------------- Dates in a zone */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat("es", { timeZone, ...options });
    formatters.set(key, cached);
  }
  return cached;
}

const toDate = (value: Date | string): Date =>
  typeof value === "string" ? new Date(value) : value;

/** "DOMINGO, 4 DE OCTUBRE". */
export function longDateOverline(date: Date, timeZone: string): string {
  return formatter(timeZone, { weekday: "long", day: "numeric", month: "long" })
    .format(date)
    .toLocaleUpperCase("es");
}

/** "domingo, 27 de septiembre de 2026". */
export function longDate(value: Date | string, timeZone: string): string {
  return formatter(timeZone, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDate(value));
}

/** "dom, 27 sept". */
export function shortWeekdayDate(value: Date | string, timeZone: string): string {
  return formatter(timeZone, { weekday: "short", day: "numeric", month: "short" }).format(
    toDate(value),
  );
}

/** "12 oct". */
export function dayMonth(value: Date | string, timeZone: string): string {
  return formatter(timeZone, { day: "numeric", month: "short" }).format(toDate(value));
}

/** "4 oct 2026". */
export function shortDate(value: Date | string, timeZone: string): string {
  return formatter(timeZone, { day: "numeric", month: "short", year: "numeric" }).format(
    toDate(value),
  );
}

/** "SEPTIEMBRE 2026". */
export function monthYearOverline(value: Date | string, timeZone: string): string {
  return formatter(timeZone, { month: "long", year: "numeric" })
    .format(toDate(value))
    .replace(" de ", " ")
    .toLocaleUpperCase("es");
}

/** "septiembre de 2026" for a calendar month (1–12), no zone involved. */
export function monthName(month: number): string {
  return formatter("UTC", { month: "long" }).format(new Date(Date.UTC(2026, month - 1, 15)));
}

/** "Buenos días," / "Buenas tardes," / "Buenas noches," by the church's clock. */
export function greeting(date: Date, timeZone: string): string {
  const { hour } = zonedParts(date, timeZone);
  if (hour < 12) return "Buenos días,";
  if (hour < 19) return "Buenas tardes,";
  return "Buenas noches,";
}

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/**
 * "hace 5 minutos", "hace 2 horas", "ayer", "hace 3 días". Days are calendar
 * days in the church's zone; past a month it falls back to the date.
 */
export function relativeTime(value: Date | string, timeZone: string, now = new Date()): string {
  const date = toDate(value);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return relative.format(-minutes, "minute");
  const days = zonedDayNumber(now, timeZone) - zonedDayNumber(date, timeZone);
  if (days === 0) return relative.format(-Math.round(minutes / 60), "hour");
  if (days < 30) return relative.format(-days, "day");
  return `el ${shortDate(date, timeZone)}`;
}

/* ------------------------------------------------------------------ Sizes */

const decimal = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

/** "2,4 MB", "3,2 GB", "820 KB" (binary units, like the quota). */
export function fileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : decimal.format(value)} ${units[unit]}`;
}

/** "60 %". */
export function percent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}
