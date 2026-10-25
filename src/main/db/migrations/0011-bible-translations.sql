CREATE TABLE bible_translations (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  copyright TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  verse_count INTEGER NOT NULL CHECK(verse_count>0)
);
INSERT INTO bible_translations
SELECT translation,'Reina-Valera 1960',copyright,imported_at,verse_count FROM bible_metadata;
CREATE TABLE bible_translation_verses (
  translation TEXT NOT NULL REFERENCES bible_translations(code) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL CHECK(chapter BETWEEN 1 AND 150),
  verse INTEGER NOT NULL CHECK(verse BETWEEN 1 AND 200),
  text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 2000),
  PRIMARY KEY(translation,book_id,chapter,verse)
);
INSERT INTO bible_translation_verses SELECT 'rvr1960',book_id,chapter,verse,text FROM bible_verses;
DROP TABLE bible_verses;
DROP TABLE bible_metadata;
ALTER TABLE bible_translation_verses RENAME TO bible_verses;
