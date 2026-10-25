import type { BibleChapter, BibleStatus } from "@shared/domain/bible";
import type { ImportedBible } from "../../services/bible-xml";
import type { SqliteDatabase } from "../../db/sqlite";

export class SqliteBibleRepository {
  constructor(private readonly db: SqliteDatabase) {}
  status(): BibleStatus {
    const row = this.db
      .prepare<{ verse_count: number; imported_at: string; copyright: string }>(
        "SELECT * FROM bible_metadata WHERE id=1",
      )
      .get();
    return {
      isImported: Boolean(row),
      verseCount: row?.verse_count ?? 0,
      importedAt: row?.imported_at ?? null,
      copyright: row?.copyright ?? null,
    };
  }
  replace(bible: ImportedBible): BibleStatus {
    this.db.transaction(() => {
      this.db.exec("DELETE FROM bible_verses; DELETE FROM bible_metadata;");
      const insert = this.db.prepare(
        "INSERT INTO bible_verses(book_id,chapter,verse,text) VALUES(?,?,?,?)",
      );
      for (const verse of bible.verses)
        insert.run(verse.bookId, verse.chapter, verse.number, verse.text);
      this.db
        .prepare(
          "INSERT INTO bible_metadata(id,translation,copyright,imported_at,verse_count) VALUES(1,'rvr1960',?,?,?)",
        )
        .run(bible.copyright, new Date().toISOString(), bible.verses.length);
    });
    return this.status();
  }
  chapter(bookId: string, chapter: number): BibleChapter {
    const verses = this.db
      .prepare<{ number: number; text: string }>(
        "SELECT verse AS number,text FROM bible_verses WHERE book_id=? AND chapter=? ORDER BY verse",
      )
      .all(bookId, chapter);
    return { translation: "rvr1960", bookId, chapter, verses };
  }
}
