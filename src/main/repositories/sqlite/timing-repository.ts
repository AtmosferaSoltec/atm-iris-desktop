import type { BlockRecord, Person, ServiceRecord, ServiceType } from "@shared/domain/models";
import type { ServiceRecordInput, ServiceTypeInput } from "@shared/schemas/timing";
import { nameKey } from "@shared/lib/text";
import { createId } from "@shared/id";
import type { SqliteDatabase, SqlRow } from "../../db/sqlite";
import type { TimingRepository } from "../types";

type PersonRow = SqlRow & {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  block_count: number;
};
type TypeRow = SqlRow & {
  id: string;
  name: string;
  color: NonNullable<ServiceType["color"]>;
  schedule_weekday: number | null;
  schedule_hour: number | null;
  schedule_minute: number | null;
  created_at: string;
  updated_at: string;
};
type RecordRow = SqlRow & {
  id: string;
  service_type_id: string | null;
  service_type_name: string;
  status: ServiceRecord["status"];
  date: string;
  created_at: string;
  updated_at: string;
};
type BlockRow = SqlRow & {
  id: string;
  name: string;
  planned_seconds: number;
  actual_seconds: number;
  person_id: string | null;
  person_name: string | null;
  status: BlockRecord["status"];
  started_at: string | null;
  ended_at: string | null;
};
export class SqliteTimingRepository implements TimingRepository {
  constructor(private readonly db: SqliteDatabase) {}
  people(): Person[] {
    return this.db
      .prepare<PersonRow>(
        "SELECT people.*, (SELECT count(*) FROM block_records WHERE person_id=people.id AND status NOT IN ('skipped','pending','running')) AS block_count FROM people ORDER BY name_key,id",
      )
      .all()
      .map((row) => ({
        id: row.id,
        name: row.name,
        blockCount: row.block_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
  }
  person(id: string): Person | null {
    return this.people().find((person) => person.id === id) ?? null;
  }
  savePerson(id: string, name: string): Person {
    const now = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO people(id,name,name_key,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_key=excluded.name_key,updated_at=excluded.updated_at",
      )
      .run(id, name, nameKey(name), now, now);
    return this.person(id)!;
  }
  deletePerson(id: string): void {
    this.db.prepare("DELETE FROM people WHERE id=?").run(id);
  }
  serviceTypes(): ServiceType[] {
    return this.db
      .prepare<{ id: string }>("SELECT id FROM service_types ORDER BY name_key,id")
      .all()
      .map((row) => this.serviceType(row.id)!);
  }
  serviceType(id: string): ServiceType | null {
    const row = this.db.prepare<TypeRow>("SELECT * FROM service_types WHERE id=?").get(id);
    if (!row) return null;
    const blocks = this.db
      .prepare<{ id: string; name: string; planned_minutes: number }>(
        "SELECT * FROM block_templates WHERE service_type_id=? ORDER BY position",
      )
      .all(id)
      .map((block) => ({ id: block.id, name: block.name, plannedMinutes: block.planned_minutes }));
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      schedule:
        row.schedule_weekday === null
          ? null
          : {
              weekday: row.schedule_weekday,
              hour: row.schedule_hour!,
              minute: row.schedule_minute!,
            },
      blocks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  saveServiceType(id: string, input: ServiceTypeInput): ServiceType {
    this.db.transaction(() => {
      const now = new Date().toISOString();
      this.db
        .prepare(
          "INSERT INTO service_types(id,name,name_key,color,schedule_weekday,schedule_hour,schedule_minute,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_key=excluded.name_key,color=excluded.color,schedule_weekday=excluded.schedule_weekday,schedule_hour=excluded.schedule_hour,schedule_minute=excluded.schedule_minute,updated_at=excluded.updated_at",
        )
        .run(
          id,
          input.name,
          nameKey(input.name),
          input.color,
          input.schedule?.weekday ?? null,
          input.schedule?.hour ?? null,
          input.schedule?.minute ?? null,
          now,
          now,
        );
      this.db.prepare("DELETE FROM block_templates WHERE service_type_id=?").run(id);
      for (const [position, block] of input.blocks.entries())
        this.db
          .prepare(
            "INSERT INTO block_templates(id,service_type_id,position,name,planned_minutes) VALUES(?,?,?,?,?)",
          )
          .run(block.id ?? createId(), id, position, block.name, block.plannedMinutes);
    });
    return this.serviceType(id)!;
  }
  deleteServiceType(id: string): void {
    this.db.prepare("DELETE FROM service_types WHERE id=?").run(id);
  }
  records(): ServiceRecord[] {
    return this.db
      .prepare<{ id: string }>("SELECT id FROM service_records ORDER BY date DESC,id DESC")
      .all()
      .map((row) => this.record(row.id)!);
  }
  record(id: string): ServiceRecord | null {
    const row = this.db.prepare<RecordRow>("SELECT * FROM service_records WHERE id=?").get(id);
    if (!row) return null;
    const blocks = this.db
      .prepare<BlockRow>("SELECT * FROM block_records WHERE service_record_id=? ORDER BY position")
      .all(id)
      .map((block) => ({
        id: block.id,
        name: block.name,
        plannedSeconds: block.planned_seconds,
        actualSeconds: block.actual_seconds,
        personId: block.person_id,
        personName: block.person_name,
        status: block.status,
        startedAt: block.started_at,
        endedAt: block.ended_at,
      }));
    return {
      id: row.id,
      serviceTypeId: row.service_type_id,
      serviceTypeName: row.service_type_name,
      status: row.status,
      date: row.date,
      blocks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  saveRecord(id: string, input: ServiceRecordInput): ServiceRecord {
    this.db.transaction(() => {
      const now = new Date().toISOString();
      this.db
        .prepare(
          "INSERT INTO service_records(id,service_type_id,service_type_name,status,date,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET service_type_id=excluded.service_type_id,service_type_name=excluded.service_type_name,status=excluded.status,date=excluded.date,updated_at=excluded.updated_at",
        )
        .run(
          id,
          input.serviceTypeId,
          input.serviceTypeName,
          input.status,
          new Date(input.date).toISOString(),
          now,
          now,
        );
      this.db.prepare("DELETE FROM block_records WHERE service_record_id=?").run(id);
      for (const [position, block] of input.blocks.entries())
        this.db
          .prepare(
            "INSERT INTO block_records(id,service_record_id,position,name,planned_seconds,actual_seconds,person_id,person_name,status,started_at,ended_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          )
          .run(
            block.id,
            id,
            position,
            block.name,
            block.plannedSeconds,
            block.actualSeconds,
            block.personId,
            block.personName,
            block.status,
            block.startedAt ? new Date(block.startedAt).toISOString() : null,
            block.endedAt ? new Date(block.endedAt).toISOString() : null,
          );
    });
    return this.record(id)!;
  }
  deleteRecord(id: string): void {
    this.db.prepare("DELETE FROM service_records WHERE id=?").run(id);
  }
}
