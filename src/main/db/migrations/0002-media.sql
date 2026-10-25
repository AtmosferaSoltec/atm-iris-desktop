CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('image','video','audio')),
  role TEXT NOT NULL CHECK(role IN ('library','background','track','sound')),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  relative_path TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
  duration_seconds REAL,
  width INTEGER,
  height INTEGER,
  sound_icon TEXT,
  is_missing INTEGER NOT NULL DEFAULT 0 CHECK(is_missing IN (0,1)),
  is_import_pending INTEGER NOT NULL DEFAULT 0 CHECK(is_import_pending IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX media_assets_role ON media_assets(role);
