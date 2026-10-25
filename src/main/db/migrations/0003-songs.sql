CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
  author TEXT NOT NULL DEFAULT '' CHECK(length(author) <= 120),
  audio_id TEXT UNIQUE REFERENCES media_assets(id) ON DELETE SET NULL,
  youtube_id TEXT,
  background_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  search_text TEXT NOT NULL,
  last_used_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (audio_id IS NULL OR youtube_id IS NULL)
);
CREATE TABLE song_sections (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  label TEXT CHECK(label IS NULL OR length(label)<=40),
  text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 2000),
  UNIQUE(song_id, position)
);
CREATE INDEX songs_archived_at ON songs(archived_at);
CREATE TRIGGER remove_track_only_songs BEFORE DELETE ON media_assets BEGIN
  DELETE FROM songs WHERE audio_id=OLD.id AND NOT EXISTS (SELECT 1 FROM song_sections WHERE song_id=songs.id);
END;
