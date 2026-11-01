// Saved service timings → table rows for an Excel sheet or the HTML of a printable report. Pure: main writes the files.

import type { BlockRecord, Person, ServiceRecord, ServiceType } from "../domain/models";
import { leaderName, recordTotals, serviceName } from "../domain/time-statistics";
import { clock, longDate, monthName, overtime } from "./format";
import { zonedParts } from "./zoned-time";

export type ExportData = {
  records: ServiceRecord[];
  types: ServiceType[];
  people: Person[];
  timeZone: string;
  churchName: string;
  generatedAt: Date;
};

const SECONDS_PER_DAY = 86_400;

/** One row per block. Dates and times are numbers so Excel can sort and add them. */
export type TimesTableRow = {
  /** The service day at 00:00 UTC, which Excel shows as the same calendar day. */
  date: Date;
  service: string;
  block: string;
  leader: string;
  /** Fractions of a day; null when the block never ran. */
  startTime: number | null;
  endTime: number | null;
  /** Fraction of a day over the plan, 0 when on time; null for a skipped block. */
  overtime: number | null;
};

export function timesTable({ records, types, people, timeZone }: ExportData): TimesTableRow[] {
  const timeOfDay = (iso: string | null): number | null => {
    if (!iso) return null;
    const parts = zonedParts(new Date(iso), timeZone);
    return (parts.hour * 3600 + parts.minute * 60 + parts.second) / SECONDS_PER_DAY;
  };
  const rows: TimesTableRow[] = [];
  for (const record of records) {
    const parts = zonedParts(new Date(record.date), timeZone);
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    for (const block of record.blocks) {
      const isSkipped = block.status === "skipped";
      rows.push({
        date,
        service: serviceName(record, types),
        block: block.name,
        leader: leaderName(block, people),
        startTime: isSkipped ? null : timeOfDay(block.startedAt),
        endTime: isSkipped ? null : timeOfDay(block.endedAt),
        overtime: isSkipped
          ? null
          : Math.max(0, block.actualSeconds - block.plannedSeconds) / SECONDS_PER_DAY,
      });
    }
  }
  return rows;
}

const esc = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("es") + value.slice(1);
}

/** "Octubre 2026" or "Septiembre 2026 – Diciembre 2026". */
export function rangeLabel(records: ServiceRecord[], timeZone: string): string {
  if (!records.length) return "";
  const keys = records.map((record) => {
    const { year, month } = zonedParts(new Date(record.date), timeZone);
    return { year, month, key: year * 12 + month };
  });
  const first = keys.reduce((a, b) => (b.key < a.key ? b : a));
  const last = keys.reduce((a, b) => (b.key > a.key ? b : a));
  const label = (value: { year: number; month: number }): string =>
    `${capitalize(monthName(value.month))} ${value.year}`;
  return first.key === last.key ? label(first) : `${label(first)} – ${label(last)}`;
}

const STYLE = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 10.5pt/1.4 "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #1c1b22; }
header { padding-bottom: 14px; border-bottom: 3px solid #ff7a59; margin-bottom: 18px; }
.eyebrow { font-size: 8pt; letter-spacing: .14em; text-transform: uppercase; color: #6b6a76; }
h1 { margin: 2px 0 2px; font-size: 24pt; letter-spacing: -.01em; }
.range { font-size: 12pt; color: #444352; }
.stats { display: flex; gap: 10px; margin-bottom: 20px; }
.stat { flex: 1; padding: 10px 12px; border-radius: 10px; background: #f6f4f2; }
.stat strong { display: block; font-size: 17pt; line-height: 1.2; }
.stat span { font-size: 8.5pt; color: #6b6a76; }
.service { margin-bottom: 14px; padding: 14px 16px; border: 1px solid #e3e0dc; border-radius: 12px; break-inside: avoid; }
.service-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
.service h2 { margin: 0; font-size: 13pt; }
.date { font-size: 9pt; color: #6b6a76; }
.total { text-align: right; font-size: 9pt; color: #6b6a76; }
.total strong { display: block; font-size: 14pt; color: #1c1b22; }
.chip { display: inline-block; margin-top: 2px; padding: 1px 9px; border-radius: 99px; font-size: 8.5pt; font-weight: 600; }
.ok { background: #dff3e8; color: #17714a; }
.over { background: #fbe0de; color: #a8312a; }
.block { display: flex; align-items: center; gap: 12px; padding: 5px 0; border-top: 1px solid #efece8; }
.who { width: 36%; min-width: 0; }
.who b { display: block; font-size: 10pt; }
.who span { font-size: 8.5pt; color: #6b6a76; }
.bar { position: relative; flex: 1; height: 9px; border-radius: 5px; background: #ece9e5; }
.fill { position: absolute; inset: 0 auto 0 0; border-radius: 5px; background: #2fae74; }
.fill.over { background: #e0524a; }
.plan { position: absolute; top: -3px; bottom: -3px; width: 2px; background: #1c1b22; }
.times { width: 22%; text-align: right; font-size: 9pt; font-variant-numeric: tabular-nums; }
.times em { display: block; font-style: normal; font-weight: 600; }
.skipped { color: #8d8b96; font-size: 9pt; }
footer { margin-top: 16px; font-size: 8pt; color: #8d8b96; text-align: center; }
`;

function blockHtml(block: BlockRecord, scale: number, people: Person[]): string {
  const who = `<div class="who"><b>${esc(block.name)}</b><span>${esc(leaderName(block, people))}</span></div>`;
  if (block.status === "skipped")
    return `<div class="block">${who}<div class="skipped" style="flex:1">Omitido</div><div class="times"></div></div>`;
  const isOver = block.actualSeconds > block.plannedSeconds;
  const width = Math.min(100, (block.actualSeconds / scale) * 100).toFixed(1);
  const planned = Math.min(100, (block.plannedSeconds / scale) * 100).toFixed(1);
  const difference = isOver ? overtime(block.actualSeconds - block.plannedSeconds) : "A tiempo";
  return `<div class="block">${who}
    <div class="bar"><div class="fill${isOver ? " over" : ""}" style="width:${width}%"></div><div class="plan" style="left:${planned}%"></div></div>
    <div class="times"><em>${clock(block.actualSeconds)}</em>de ${clock(block.plannedSeconds)} · ${difference}</div></div>`;
}

export function timesReportHtml(data: ExportData): string {
  const { records, types, people, timeZone, churchName, generatedAt } = data;
  const totals = records.map(recordTotals);
  const extra = totals.reduce((sum, total) => sum + total.overtime, 0);
  const onTime = totals.filter((total) => total.overtime === 0).length;
  const average = records.length
    ? totals.reduce((sum, total) => sum + total.actual, 0) / records.length
    : 0;
  const services = records
    .map((record, index) => {
      const total = totals[index]!;
      const scale = Math.max(
        ...record.blocks.map((block) => Math.max(block.actualSeconds, block.plannedSeconds)),
        1,
      );
      return `<section class="service">
  <div class="service-head">
    <div><h2>${esc(serviceName(record, types))}</h2><div class="date">${esc(capitalize(longDate(record.date, timeZone)))}</div></div>
    <div class="total"><strong>${clock(total.actual)}</strong>de ${clock(total.planned)} planificados<br>
      <span class="chip ${total.overtime > 0 ? "over" : "ok"}">${total.overtime > 0 ? overtime(total.overtime) : "A tiempo"}</span></div>
  </div>
  ${record.blocks.map((block) => blockHtml(block, scale, people)).join("\n")}
</section>`;
    })
    .join("\n");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Informe de tiempos</title><style>${STYLE}</style></head><body>
<header><div class="eyebrow">${esc(churchName || "Iris")}</div><h1>Informe de tiempos</h1><div class="range">${esc(rangeLabel(records, timeZone))}</div></header>
<div class="stats">
  <div class="stat"><strong>${records.length}</strong><span>${records.length === 1 ? "servicio" : "servicios"}</span></div>
  <div class="stat"><strong>${clock(average)}</strong><span>duración promedio</span></div>
  <div class="stat"><strong>${onTime} de ${records.length}</strong><span>a tiempo</span></div>
  <div class="stat"><strong>${extra ? overtime(extra) : "0:00"}</strong><span>tiempo extra total</span></div>
</div>
${services}
<footer>Generado por Iris el ${esc(longDate(generatedAt, timeZone))}</footer>
</body></html>`;
}
