import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createId } from "@shared/id";
import { recordInput, resumeTimer, startNext, timerFor, finish } from "@shared/domain/block-timer";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { SqliteTimingRepository } from "../repositories/sqlite/timing-repository";
import { SqliteSettingsRepository } from "../repositories/sqlite/settings-repository";
import { TimingService } from "./timing-service";
let db: SqliteDatabase;
let repository: SqliteTimingRepository;
let service: TimingService;
beforeEach(() => {
  db = createTestDatabase();
  repository = new SqliteTimingRepository(db);
  const settings = new SqliteSettingsRepository(db);
  settings.initialize("America/Lima");
  service = new TimingService(repository, settings);
});
afterEach(() => db.close());
describe("service timing", () => {
  it("normalizes duplicate people and service types and accepts projection-only types", () => {
    service.savePerson(null, "  José  Pérez ");
    expect(() => service.savePerson(null, "jose perez")).toThrow("Ya existe");
    const type = service.saveServiceType(null, { name: "Culto general", blocks: [] });
    expect(type.blocks).toEqual([]);
    expect(() => service.saveServiceType(null, { name: "CULTO GENERAL", blocks: [] })).toThrow(
      "Ya existe",
    );
    service.selectService(type.id);
    expect(service.selectedService()).toBe(type.id);
  });
  it("persists and resumes a running record, preserving names after person/type deletion", () => {
    const person = service.savePerson(null, "Ana Torres");
    const type = service.saveServiceType(null, {
      name: "Culto",
      blocks: [
        { name: "Bienvenida", plannedMinutes: 10 },
        { name: "Alabanzas", plannedMinutes: 15 },
      ],
    });
    let timer = startNext(
      timerFor(type, createId),
      { id: person.id, name: person.name },
      Date.UTC(2026, 9, 25, 15),
    );
    const saved = service.saveRecord(timer.recordId, recordInput(timer));
    const resumed = resumeTimer(saved);
    expect(resumed?.current).toBe(0);
    expect(resumed?.blocks[0].startedAt).toBe(timer.blocks[0].startedAt);
    timer = startNext(timer, { id: null, name: null }, Date.UTC(2026, 9, 25, 15, 10));
    timer = finish(timer, Date.UTC(2026, 9, 25, 15, 20));
    service.saveRecord(timer.recordId, recordInput(timer));
    repository.deletePerson(person.id);
    repository.deleteServiceType(type.id);
    const record = repository.record(timer.recordId)!;
    expect(record.serviceTypeId).toBeNull();
    expect(record.serviceTypeName).toBe("Culto");
    expect(record.blocks[0]).toMatchObject({
      personId: null,
      personName: "Ana Torres",
      actualSeconds: 600,
    });
  });
  it("keeps historical names when a saved record is adjusted after a rename", () => {
    const person = service.savePerson(null, "Ana Torres");
    const type = service.saveServiceType(null, {
      name: "Culto",
      blocks: [{ name: "Bienvenida", plannedMinutes: 10 }],
    });
    const timer = finish(
      startNext(timerFor(type, createId), { id: person.id, name: person.name }, 1000),
      61000,
    );
    service.saveRecord(timer.recordId, recordInput(timer));
    service.savePerson(person.id, "Ana Nueva");
    service.saveServiceType(type.id, { name: "Culto nuevo", blocks: [] });
    const record = service.adjustDuration(timer.recordId, timer.blocks[0].id, 80);
    expect(record.serviceTypeName).toBe("Culto");
    expect(record.blocks[0]).toMatchObject({
      personName: "Ana Torres",
      actualSeconds: 80,
      status: "adjusted",
    });
  });
});

it("rejects skipping and starting a later block while the first is pending", () => {
  const type = service.saveServiceType(null, {
    name: "Culto",
    blocks: [
      { name: "Primero", plannedMinutes: 1 },
      { name: "Segundo", plannedMinutes: 1 },
    ],
  });
  const timer = startNext(timerFor(type, createId), { id: null, name: null }, 1000);
  const input = recordInput(timer)!;
  const blocks = input.blocks.map((block, index) => ({
    ...block,
    status: index === 0 ? ("pending" as const) : ("running" as const),
    startedAt: index === 1 ? new Date(1000).toISOString() : null,
  }));
  expect(() => service.saveRecord(timer.recordId, { ...input, blocks })).toThrow("en orden");
  expect(() =>
    service.saveRecord(timer.recordId, {
      ...input,
      blocks: [{ ...blocks[0], status: "skipped" }, blocks[1]],
    }),
  ).toThrow("sin omitir");
  expect(repository.records()).toEqual([]);
});

it("saves a detached record with its historical service name and compares offset filters as instants", () => {
  const type = service.saveServiceType(null, {
    name: "Culto",
    blocks: [{ name: "Primero", plannedMinutes: 1 }],
  });
  const timer = startNext(timerFor(type, createId), { id: null, name: null }, 1000);
  const input = recordInput(timer)!;
  const record = service.saveRecord(timer.recordId, {
    ...input,
    date: "2026-10-25T10:00:00-05:00",
    serviceTypeId: null,
    serviceTypeName: "Servicio histórico",
  });
  expect(record).toMatchObject({
    serviceTypeId: null,
    serviceTypeName: "Servicio histórico",
    date: "2026-10-25T15:00:00.000Z",
  });
  expect(
    service.listRecords({
      page: 1,
      limit: 10,
      from: "2026-10-25T09:00:00-05:00",
      to: "2026-10-25T11:00:00-05:00",
    }).meta.total,
  ).toBe(1);
});
