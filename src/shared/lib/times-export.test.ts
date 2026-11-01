import { expect, it } from "vitest";
import type { ServiceRecord } from "../domain/models";
import { rangeLabel, timesReportHtml, timesTable, type ExportData } from "./times-export";

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

it("builds one row per block with real dates, start/end times and only the overtime", () => {
  const timed = {
    ...block("Alabanza", 600, 700),
    startedAt: "2026-10-04T15:05:00Z",
    endedAt: "2026-10-04T15:16:40Z",
  };
  const rows = timesTable(
    data([
      record("2026-10-04T15:00:00Z", [
        timed,
        block("Palabra", 600, 500),
        block("Ofrenda", 300, 0, "skipped"),
      ]),
    ]),
  );
  expect(rows[0]!.date.toISOString()).toBe("2026-10-04T00:00:00.000Z");
  expect(rows[0]).toMatchObject({ service: "Domingo", block: "Alabanza", leader: "Ana" });
  expect(rows[0]!.startTime).toBeCloseTo((10 * 3600 + 5 * 60) / 86400);
  expect(rows[0]!.endTime).toBeCloseTo((10 * 3600 + 16 * 60 + 40) / 86400);
  expect(rows[0]!.overtime).toBeCloseTo(100 / 86400);
  expect(rows[1]).toMatchObject({ startTime: null, endTime: null, overtime: 0 });
  expect(rows[2]).toMatchObject({ overtime: null });
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
