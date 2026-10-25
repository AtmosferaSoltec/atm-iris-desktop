CREATE TABLE service_types (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),
 name_key TEXT NOT NULL UNIQUE,
 color TEXT NOT NULL CHECK(color IN ('amber','coral','rose','violet','indigo','green')),
 schedule_weekday INTEGER,
 schedule_hour INTEGER,
 schedule_minute INTEGER,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE block_templates (
 id TEXT PRIMARY KEY,
 service_type_id TEXT NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
 position INTEGER NOT NULL,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),
 planned_minutes INTEGER NOT NULL CHECK(planned_minutes BETWEEN 1 AND 240),
 UNIQUE(service_type_id,position)
);
