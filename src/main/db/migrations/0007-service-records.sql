CREATE TABLE service_records (
 id TEXT PRIMARY KEY,
 service_type_id TEXT REFERENCES service_types(id) ON DELETE SET NULL,
 service_type_name TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('inProgress','finished')),
 date TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX one_running_service ON service_records(status) WHERE status='inProgress';
CREATE TABLE block_records (
 id TEXT PRIMARY KEY,
 service_record_id TEXT NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
 position INTEGER NOT NULL,
 name TEXT NOT NULL,
 planned_seconds INTEGER NOT NULL,
 actual_seconds INTEGER NOT NULL,
 person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
 person_name TEXT,
 status TEXT NOT NULL CHECK(status IN ('pending','running','completed','skipped','adjusted')),
 started_at TEXT,
 ended_at TEXT,
 UNIQUE(service_record_id,position)
);
CREATE INDEX service_records_date ON service_records(date);
CREATE INDEX block_records_person_id ON block_records(person_id);
