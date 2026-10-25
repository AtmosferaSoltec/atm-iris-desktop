import type { BibleChapter, BibleStatus, BibleTranslation } from "@shared/domain/bible";
import type { ImportedBible } from "../../services/bible-xml";
import type { SqliteDatabase } from "../../db/sqlite";

export class SqliteBibleRepository {
  constructor(private readonly db: SqliteDatabase) {}
  status(): BibleStatus {
    const translations = this.db
      .prepare<BibleTranslation>(
        "SELECT code,name,copyright,imported_at AS importedAt,verse_count AS verseCount FROM bible_translations ORDER BY name COLLATE NOCASE,code",
      )
      .all();
    const saved = this.db
      .prepare<{ value: string }>("SELECT value FROM app_settings WHERE key='bibleTranslation'")
      .get();
    const selected =
      translations.find(
        (translation) => translation.code === (saved ? JSON.parse(saved.value) : null),
      ) ?? translations[0];
    return {
      translations,
      selectedTranslation: selected?.code ?? null,
      isImported: Boolean(selected),
      verseCount: selected?.verseCount ?? 0,
      importedAt: selected?.importedAt ?? null,
      copyright: selected?.copyright ?? null,
    };
  }
  select(code: string): void {
    this.db
      .prepare(
        "INSERT INTO app_settings(key,value) VALUES('bibleTranslation',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(JSON.stringify(code));
  }
  replace(bible: ImportedBible): BibleStatus {
    const selected = this.status().selectedTranslation;
    this.db.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO bible_translations(code,name,copyright,imported_at,verse_count) VALUES(?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name,copyright=excluded.copyright,imported_at=excluded.imported_at,verse_count=excluded.verse_count",
        )
        .run(
          bible.code,
          bible.name,
          bible.copyright,
          new Date().toISOString(),
          bible.verses.length,
        );
      this.db.prepare("DELETE FROM bible_verses WHERE translation=?").run(bible.code);
      const insert = this.db.prepare(
        "INSERT INTO bible_verses(translation,book_id,chapter,verse,text) VALUES(?,?,?,?,?)",
      );
      for (const verse of bible.verses)
        insert.run(bible.code, verse.bookId, verse.chapter, verse.number, verse.text);
      this.select(selected ?? bible.code);
    });
    return this.status();
  }
  chapter(translation: string, bookId: string, chapter: number): BibleChapter {
    const verses = this.db
      .prepare<{ number: number; text: string }>(
        "SELECT verse AS number,text FROM bible_verses WHERE translation=? AND book_id=? AND chapter=? ORDER BY verse",
      )
      .all(translation, bookId, chapter);
    const name = this.status().translations.find((entry) => entry.code === translation)?.name;
    return {
      translation,
      translationLabel: ["rvr1960", "rvr1909", "nvi"].includes(translation)
        ? translation.toUpperCase()
        : name,
      bookId,
      chapter,
      verses,
    };
  }
}
