CREATE TABLE bible_metadata (
  id INTEGER PRIMARY KEY CHECK(id=1),
  translation TEXT NOT NULL CHECK(translation='rvr1960'),
  copyright TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  verse_count INTEGER NOT NULL CHECK(verse_count>0)
);
CREATE TABLE bible_verses (
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL CHECK(chapter BETWEEN 1 AND 150),
  verse INTEGER NOT NULL CHECK(verse BETWEEN 1 AND 200),
  text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 2000),
  PRIMARY KEY(book_id,chapter,verse)
);
