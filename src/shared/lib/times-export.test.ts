import { expect, it } from "vitest";
import type { ServiceRecord } from "../domain/models";
import { rangeLabel, timesCsv, timesReportHtml, type ExportData } from "./times-export";

const block = (
  name: string,
  planned: number,
  actual: number,
  status: ServiceRecord["blocks"][number]["status"] = "completed",
): ServiceRecord["blocks"][number] => ({
  id: name,
  name,
  plannedSeconds: planned,
  actualSeconds: actual,
  personId: null,
  personName: "Ana",
  status,
  startedAt: null,
  endedAt: null,
});

const record = (date: string, blocks: ServiceRecord["blocks"]): ServiceRecord => ({
  id: date,
  date,
  serviceTypeId: null,
  serviceTypeName: "Domingo",
  status: "finished",
  blocks,
  createdAt: date,
  updatedAt: date,
});

const data = (records: ServiceRecord[]): ExportData => ({
  records,
  types: [],
  people: [],
  timeZone: "America/Lima",
  churchName: "Mi iglesia",
  generatedAt: new Date("2026-10-31T12:00:00Z"),
});

it("writes one CSV row per block with durations a spreadsheet reads as time", () => {
  const csv = timesCsv(
    data([
      record("2026-10-04T15:00:00Z", [
        block("Alabanza, parte 1", 600, 700),
        block("=SUMA(1)", 300, 0, "skipped"),
      ]),
    ]),
  );
  const lines = csv.trim().split("\r\n");
  expect(lines[0]).toBe(
    "Fecha,Hora,Servicio,Bloque,Responsable,Planificado,Real,Diferencia (segundos),Estado",
  );
  expect(lines[1]).toBe(
    '2026-10-04,10:00,Domingo,"Alabanza, parte 1",Ana,0:10:00,0:11:40,100,Completado',
  );
  expect(lines[2]).toContain("'=SUMA(1)");
  expect(lines[2]).toContain(",0,Omitido");
});

it("builds a report without tables and escapes what people typed", () => {
  const html = timesReportHtml(
    data([record("2026-10-04T15:00:00Z", [block("<script>x</script>", 600, 700)])]),
  );
  expect(html).not.toContain("<table");
  expect(html).not.toContain("<script>");
  expect(html).toContain("&#60;script&#62;");
  expect(html).toContain("Informe de tiempos");
  expect(html).toContain("+1:40");
});

it("labels a single month or a range of months", () => {
  const october = record("2026-10-04T15:00:00Z", []);
  const december = record("2026-12-06T15:00:00Z", []);
  expect(rangeLabel([october], "America/Lima")).toBe("Octubre 2026");
  expect(rangeLabel([december, october], "America/Lima")).toBe("Octubre 2026 – Diciembre 2026");
});
