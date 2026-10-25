import { compareNames, nameKey } from "@shared/lib/text";
import { startOfZonedMonth, zonedParts, zonedTimeToUtc } from "@shared/lib/zoned-time";
import type { BlockRecord, Id, Person, ServiceRecord, ServiceType } from "./models";

// Port of atm-iris-ios/iris/Features/Times/TimeStatistics.swift (IRIS_SPEC §7.10):
// skipped blocks never count, adjusted ones do, overtime has no tolerance
// margin, and periods are calendar months in the church's time zone.

export type Period =
  | { kind: "thisMonth" }
  | { kind: "lastMonth" }
  | { kind: "last3Months" }
  | { kind: "thisYear" }
  | { kind: "all" }
  | { kind: "month"; year: number; month: number };

export type StatisticsFilter = {
  period: Period;
  serviceTypeId?: Id | null;
  /** Compared ignoring case and accents. */
  blockName?: string | null;
  personId?: Id | null;
};

/** One counted block, with the service it belongs to. */
export type Entry = {
  recordId: Id;
  date: string;
  serviceTypeId: Id | null;
  serviceTypeName: string;
  block: BlockRecord;
};

export type PersonStat = {
  personId: Id;
  participations: number;
  timesOver: number;
  /** Average of the times the person went over; 0 if never. */
  avgOvertimeWhenOver: number;
  maxOvertime: number;
  totalOvertime: number;
};

export type BlockStat = {
  /** Name as written in the most recent record. */
  name: string;
  timesOver: number;
  total: number;
  avgOvertimeWhenOver: number;
  avgActual: number;
  avgPlanned: number;
};

export type TimeStatistics = {
  /** Counted blocks, newest record first. */
  entries: Entry[];
  /** Services with at least one counted block. */
  serviceCount: number;
  /** Per service, over its counted blocks. */
  averageDuration: number;
  /** Per service: counted real minus planned, when positive. */
  averageOvertimePerService: number;
  overBlocks: { over: number; total: number };
  /** Highest total overtime first. */
  byPerson: PersonStat[];
  /** Most often over first. */
  byBlock: BlockStat[];
};

/** Real − planned when positive; 0 otherwise (IRIS_SPEC §7.10). */
export function overtimeSeconds(
  block: Pick<BlockRecord, "actualSeconds" | "plannedSeconds">,
): number {
  return Math.max(0, block.actualSeconds - block.plannedSeconds);
}

export function isOver(
  block: Pick<BlockRecord, "status" | "actualSeconds" | "plannedSeconds">,
): boolean {
  return block.status !== "skipped" && block.actualSeconds > block.plannedSeconds;
}

/** Blocks that count: everything but skipped ones. */
export function countedBlocks(record: ServiceRecord): BlockRecord[] {
  return record.blocks.filter((block) => block.status !== "skipped");
}

/** Totals of one record over its counted blocks. */
export function recordTotals(record: ServiceRecord): {
  actual: number;
  planned: number;
  overtime: number;
} {
  const blocks = countedBlocks(record);
  const actual = blocks.reduce((sum, block) => sum + block.actualSeconds, 0);
  const planned = blocks.reduce((sum, block) => sum + block.plannedSeconds, 0);
  return { actual, planned, overtime: Math.max(0, actual - planned) };
}

/** `[from, to)` as UTC instants, or null for "all". Months start on day 1 at 00:00 in `timeZone`. */
export function dateRange(
  period: Period,
  now: Date,
  timeZone: string,
): { from: Date; to: Date } | null {
  switch (period.kind) {
    case "all":
      return null;
    case "thisMonth":
      return { from: startOfZonedMonth(now, timeZone), to: startOfZonedMonth(now, timeZone, 1) };
    case "lastMonth":
      return { from: startOfZonedMonth(now, timeZone, -1), to: startOfZonedMonth(now, timeZone) };
    case "last3Months":
      return {
        from: startOfZonedMonth(now, timeZone, -2),
        to: startOfZonedMonth(now, timeZone, 1),
      };
    case "thisYear": {
      const { year } = zonedParts(now, timeZone);
      return {
        from: zonedTimeToUtc(timeZone, year, 1),
        to: zonedTimeToUtc(timeZone, year + 1, 1),
      };
    }
    case "month":
      return {
        from: zonedTimeToUtc(timeZone, period.year, period.month),
        to: zonedTimeToUtc(timeZone, period.year, period.month + 1),
      };
  }
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeStatistics(
  records: ServiceRecord[],
  filter: StatisticsFilter,
  now: Date,
  timeZone: string,
): TimeStatistics {
  const range = dateRange(filter.period, now, timeZone);
  const blockKey = filter.blockName ? nameKey(filter.blockName) : null;

  const entries: Entry[] = [];
  const services: { actual: number; planned: number }[] = [];
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  for (const record of sorted) {
    // A service still running is left out until it ends (contract §14).
    if (record.status === "inProgress") continue;
    const time = new Date(record.date).getTime();
    if (range && (time < range.from.getTime() || time >= range.to.getTime())) continue;
    if (filter.serviceTypeId && record.serviceTypeId !== filter.serviceTypeId) continue;
    const counted = record.blocks.filter(
      (block) =>
        block.status !== "skipped" &&
        (blockKey === null || nameKey(block.name) === blockKey) &&
        (!filter.personId || block.personId === filter.personId),
    );
    if (counted.length === 0) continue;
    for (const block of counted) {
      entries.push({
        recordId: record.id,
        date: record.date,
        serviceTypeId: record.serviceTypeId,
        serviceTypeName: record.serviceTypeName,
        block,
      });
    }
    services.push({
      actual: counted.reduce((sum, block) => sum + block.actualSeconds, 0),
      planned: counted.reduce((sum, block) => sum + block.plannedSeconds, 0),
    });
  }

  return {
    entries,
    serviceCount: services.length,
    averageDuration: average(services.map((service) => service.actual)),
    averageOvertimePerService: average(
      services.map((service) => Math.max(0, service.actual - service.planned)),
    ),
    overBlocks: {
      over: entries.filter((entry) => isOver(entry.block)).length,
      total: entries.length,
    },
    byPerson: personStats(entries),
    byBlock: blockStats(entries),
  };
}

function personStats(entries: Entry[]): PersonStat[] {
  const byPerson = new Map<Id, BlockRecord[]>();
  for (const { block } of entries) {
    if (!block.personId) continue;
    byPerson.set(block.personId, [...(byPerson.get(block.personId) ?? []), block]);
  }
  return [...byPerson.entries()]
    .map(([personId, blocks]) => {
      const overtimes = blocks.filter(isOver).map(overtimeSeconds);
      return {
        personId,
        participations: blocks.length,
        timesOver: overtimes.length,
        avgOvertimeWhenOver: average(overtimes),
        maxOvertime: overtimes.length ? Math.max(...overtimes) : 0,
        totalOvertime: overtimes.reduce((sum, value) => sum + value, 0),
      };
    })
    .sort(
      (a, b) =>
        b.totalOvertime - a.totalOvertime ||
        b.timesOver - a.timesOver ||
        b.participations - a.participations ||
        a.personId.localeCompare(b.personId),
    );
}

function blockStats(entries: Entry[]): BlockStat[] {
  const groups = new Map<string, BlockRecord[]>();
  for (const { block } of entries) {
    const key = nameKey(block.name);
    groups.set(key, [...(groups.get(key) ?? []), block]);
  }
  return [...groups.values()]
    .map((blocks) => {
      const overtimes = blocks.filter(isOver).map(overtimeSeconds);
      return {
        name: blocks[0].name,
        timesOver: overtimes.length,
        total: blocks.length,
        avgOvertimeWhenOver: average(overtimes),
        avgActual: average(blocks.map((block) => block.actualSeconds)),
        avgPlanned: average(blocks.map((block) => block.plannedSeconds)),
      };
    })
    .sort((a, b) => b.timesOver - a.timesOver || compareNames(a.name, b.name));
}

/* ------------------------------------------------------------------ Names */

/** Current name, else the saved one; "Servicio eliminado" when there is none. */
export function serviceName(
  record: Pick<ServiceRecord, "serviceTypeId" | "serviceTypeName">,
  types: ServiceType[],
): string {
  return (
    types.find((type) => type.id === record.serviceTypeId)?.name ??
    (record.serviceTypeName || "Servicio eliminado")
  );
}

/** Current name, else the one saved with the record; "Persona eliminada" or "Sin responsable". */
export function leaderName(
  block: Pick<BlockRecord, "personId" | "personName">,
  people: Person[],
): string {
  if (!block.personId) return block.personName ?? "Sin responsable";
  return (
    people.find((person) => person.id === block.personId)?.name ??
    block.personName ??
    "Persona eliminada"
  );
}

/** A person by id, falling back to the name saved in any record. */
export function personName(id: Id, people: Person[], records: ServiceRecord[]): string {
  const current = people.find((person) => person.id === id)?.name;
  if (current) return current;
  for (const record of records) {
    const saved = record.blocks.find((block) => block.personId === id)?.personName;
    if (saved) return saved;
  }
  return "Persona eliminada";
}

/** Distinct block names in the records, alphabetical. */
export function blockNames(records: ServiceRecord[]): string[] {
  const names = new Map<string, string>();
  for (const record of records) {
    for (const block of record.blocks) {
      if (!names.has(nameKey(block.name))) names.set(nameKey(block.name), block.name);
    }
  }
  return [...names.values()].sort(compareNames);
}
