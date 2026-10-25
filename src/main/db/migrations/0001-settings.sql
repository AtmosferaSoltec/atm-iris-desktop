CREATE TABLE church_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
  timezone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE projection_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  font_family TEXT NOT NULL DEFAULT 'system',
  font_size_pt INTEGER NOT NULL DEFAULT 100 CHECK(font_size_pt BETWEEN 100 AND 250),
  font_bold INTEGER NOT NULL DEFAULT 0 CHECK(font_bold IN (0,1)),
  font_italic INTEGER NOT NULL DEFAULT 0 CHECK(font_italic IN (0,1)),
  uppercase INTEGER NOT NULL DEFAULT 0 CHECK(uppercase IN (0,1)),
  default_background_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL CHECK(json_valid(value))
);
