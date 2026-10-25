CREATE TABLE people (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 name_key TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
