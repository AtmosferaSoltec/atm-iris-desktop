-- Lyrics size from 60 to 200 (was 100 to 250): long verses need smaller text, and nobody used
-- the top of the range. SQLite cannot change a CHECK in place, so the one-row table is rebuilt.
CREATE TABLE projection_settings_new (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  font_family TEXT NOT NULL DEFAULT 'system',
  font_size_pt INTEGER NOT NULL DEFAULT 100 CHECK(font_size_pt BETWEEN 60 AND 200),
  font_bold INTEGER NOT NULL DEFAULT 0 CHECK(font_bold IN (0,1)),
  font_italic INTEGER NOT NULL DEFAULT 0 CHECK(font_italic IN (0,1)),
  uppercase INTEGER NOT NULL DEFAULT 0 CHECK(uppercase IN (0,1)),
  default_background_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO projection_settings_new
  SELECT id, font_family, min(font_size_pt, 200), font_bold, font_italic, uppercase,
         default_background_id, created_at, updated_at
  FROM projection_settings;
DROP TABLE projection_settings;
ALTER TABLE projection_settings_new RENAME TO projection_settings;
