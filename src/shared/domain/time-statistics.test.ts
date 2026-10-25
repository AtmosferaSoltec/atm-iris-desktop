import { describe, expect, it } from "vitest";
import { sampleContent } from "./test-fixtures/timing-sample";
import type { BlockRecord, ServiceRecord } from "./models";
import {
  blockNames,
  computeStatistics,
  dateRange,
  leaderName,
  serviceName,
  type Period,
} from "./time-statistics";

const LIMA = "America/Lima";
const NOW = new Date("2026-10-15T17:00:00Z");

let sequence = 0;
function block(
  name: string,
  planned: number,
  actual: number,
  personId: string | null = null,
  status: BlockRecord["status"] = "completed",
): BlockRecord {
  sequence += 1;
  return {
    id: `b${sequence}`,
    name,
    plannedSeconds: planned,
    actualSeconds: actual,
    personId,
    personName: personId,
    status,
    startedAt: null,
    endedAt: null,
  };
}

function record(date: string, blocks: BlockRecord[], serviceTypeId = "culto"): ServiceRecord {
  sequence += 1;
  return {
    id: `r${sequence}`,
    date,
    serviceTypeId,
    serviceTypeName: "Culto general",
    status: "finished",
    blocks,
    createdAt: date,
    updatedAt: date,
  };
}

const all: Period = { kind: "all" };

describe("blocks and overtime (IRIS_SPEC §7.10)", () => {
  it("has no tolerance margin: one second over is over", () => {
    const stats = computeStatistics(
      [record("2026-10-04T15:00:00Z", [block("Prédica", 600, 601), block("Anuncios", 300, 300)])],
      { period: all },
      NOW,
      LIMA,
    );
    expect(stats.overBlocks).toEqual({ over: 1, total: 2 });
    expect(stats.averageOvertimePerService).toBe(1);
  });

  it("ignores skipped blocks everywhere and counts adjusted ones", () => {
    const stats = computeStatistics(
      [
        record("2026-10-04T15:00:00Z", [
          block("Prédica", 600, 900, "ana", "adjusted"),
          block("Anuncios", 300, 0, "luis", "skipped"),
        ]),
      ],
      { period: all },
      NOW,
      LIMA,
    );
    expect(stats.overBlocks).toEqual({ over: 1, total: 1 });
    expect(stats.averageDuration).toBe(900);
    expect(stats.byPerson.map((person) => person.personId)).toEqual(["ana"]);
  });

  it("a service only counts with at least one block that passes the filters", () => {
    const records = [
      record("2026-10-04T15:00:00Z", [block("Prédica", 600, 700, "ana")]),
      record("2026-10-11T15:00:00Z", [block("Alabanzas", 600, 500, "luis")]),
    ];
    const stats = computeStatistics(records, { period: all, personId: "ana" }, NOW, LIMA);
    expect(stats.serviceCount).toBe(1);
    expect(stats.averageDuration).toBe(700);
  });

  it("filters blocks by name ignoring accents and case", () => {
    const records = [
      record("2026-10-04T15:00:00Z", [block("Prédica", 600, 700)]),
      record("2026-10-11T15:00:00Z", [block("predica", 600, 500), block("Anuncios", 60, 60)]),
    ];
    const stats = computeStatistics(records, { period: all, blockName: "PREDICA" }, NOW, LIMA);
    expect(stats.overBlocks.total).toBe(2);
    expect(stats.byBlock).toHaveLength(1);
    // Named as in the most recent record.
    expect(stats.byBlock[0].name).toBe("predica");
    expect(stats.byBlock[0]).toMatchObject({
      timesOver: 1,
      total: 2,
      avgActual: 600,
      avgPlanned: 600,
    });
  });

  it("filters by service type", () => {
    const records = [
      record("2026-10-04T15:00:00Z", [block("A", 60, 120)], "culto"),
      record("2026-10-05T15:00:00Z", [block("A", 60, 60)], "jovenes"),
    ];
    expect(
      computeStatistics(records, { period: all, serviceTypeId: "jovenes" }, NOW, LIMA).serviceCount,
    ).toBe(1);
  });
});

describe("per person", () => {
  it("orders by total overtime and averages only the times over", () => {
    const records = [
      record("2026-10-04T15:00:00Z", [block("A", 600, 900, "ana"), block("B", 600, 660, "luis")]),
      record("2026-10-11T15:00:00Z", [block("A", 600, 500, "ana"), block("B", 600, 720, "luis")]),
      record("2026-10-12T15:00:00Z", [block("A", 600, 700, "ana")]),
    ];
    const [first, second] = computeStatistics(records, { period: all }, NOW, LIMA).byPerson;
    expect(first).toEqual({
      personId: "ana",
      participations: 3,
      timesOver: 2,
      avgOvertimeWhenOver: 200,
      maxOvertime: 300,
      totalOvertime: 400,
    });
    expect(second).toMatchObject({ personId: "luis", totalOvertime: 180, avgOvertimeWhenOver: 90 });
  });

  it("leaves blocks without a leader out of the table", () => {
    const stats = computeStatistics(
      [record("2026-10-04T15:00:00Z", [block("A", 60, 120, null)])],
      { period: all },
      NOW,
      LIMA,
    );
    expect(stats.byPerson).toEqual([]);
    expect(stats.overBlocks.over).toBe(1);
  });
});

describe("periods in the church's zone", () => {
  // 03:00 UTC on Oct 1 is still Sep 30 in Lima.
  const lateSeptember = record("2026-10-01T03:00:00Z", [block("A", 60, 60)]);
  const earlyOctober = record("2026-10-01T06:00:00Z", [block("A", 60, 60)]);
  const july = record("2026-07-20T15:00:00Z", [block("A", 60, 60)]);
  const lastYear = record("2025-12-31T15:00:00Z", [block("A", 60, 60)]);
  const records = [lateSeptember, earlyOctober, july, lastYear];
  const count = (period: Period): number =>
    computeStatistics(records, { period }, NOW, LIMA).serviceCount;

  it("splits months at local midnight", () => {
    expect(count({ kind: "thisMonth" })).toBe(1);
    expect(count({ kind: "lastMonth" })).toBe(1);
    expect(count({ kind: "month", year: 2026, month: 9 })).toBe(1);
  });

  it("last 3 months is this month and the two before", () => {
    expect(count({ kind: "last3Months" })).toBe(2);
    expect(dateRange({ kind: "last3Months" }, NOW, LIMA)).toEqual({
      from: new Date("2026-08-01T05:00:00Z"),
      to: new Date("2026-11-01T05:00:00Z"),
    });
  });

  it("this year and all", () => {
    expect(count({ kind: "thisYear" })).toBe(3);
    expect(count({ kind: "all" })).toBe(4);
    expect(dateRange({ kind: "all" }, NOW, LIMA)).toBeNull();
  });

  it("follows daylight saving time in zones that have it", () => {
    expect(dateRange({ kind: "month", year: 2026, month: 7 }, NOW, "Europe/Madrid")).toEqual({
      from: new Date("2026-06-30T22:00:00Z"),
      to: new Date("2026-07-31T22:00:00Z"),
    });
    expect(dateRange({ kind: "month", year: 2026, month: 1 }, NOW, "Europe/Madrid")?.from).toEqual(
      new Date("2025-12-31T23:00:00Z"),
    );
  });
});

describe("the iPad's sample church", () => {
  it("gives the same summary as TimeSummaryView", () => {
    const { records } = sampleContent(NOW);
    const stats = computeStatistics(records, { period: all }, NOW, LIMA);
    expect(stats.serviceCount).toBe(10);
    expect(Math.round(stats.averageDuration)).toBe(4626); // 1:17:06
    expect(Math.round(stats.averageOvertimePerService)).toBe(456); // +7:36
    expect(stats.overBlocks).toEqual({ over: 24, total: 39 });
    const daniel = stats.byPerson.find(
      (person) => person.personId === records[0].blocks[2].personId,
    );
    expect(daniel).toMatchObject({
      participations: 7,
      timesOver: 6,
      avgOvertimeWhenOver: 480,
      maxOvertime: 785,
      totalOvertime: 2880,
    });
  });
});

describe("names", () => {
  it("falls back to saved names", () => {
    expect(leaderName({ personId: null, personName: null }, [])).toBe("Sin responsable");
    expect(leaderName({ personId: "x", personName: "Ana" }, [])).toBe("Ana");
    expect(leaderName({ personId: "x", personName: null }, [])).toBe("Persona eliminada");
    expect(serviceName({ serviceTypeId: "gone", serviceTypeName: "Vigilia" }, [])).toBe("Vigilia");
    expect(serviceName({ serviceTypeId: "gone", serviceTypeName: "" }, [])).toBe(
      "Servicio eliminado",
    );
  });

  it("lists distinct block names alphabetically", () => {
    const records = [
      record("2026-10-04T15:00:00Z", [
        block("Prédica", 1, 1),
        block("predica", 1, 1),
        block("Anuncios", 1, 1),
      ]),
    ];
    expect(blockNames(records)).toEqual(["Anuncios", "Prédica"]);
  });
});

describe("deleted leader display", () => {
  it("uses the historical name after SQLite nulls the foreign key", () => {
    expect(leaderName({ personId: null, personName: "María Pérez" }, [])).toBe("María Pérez");
    expect(leaderName({ personId: null, personName: null }, [])).toBe("Sin responsable");
  });
});
