import { afterEach, beforeEach, expect, it } from "vitest";
import { bibleSampleXml } from "@shared/domain/test-fixtures/bible-sample";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { SqliteBibleRepository } from "../repositories/sqlite/bible-repository";
import { BibleService } from "./bible-service";
import { parseBibleXml } from "./bible-xml";
let db: SqliteDatabase;
let service: BibleService;
beforeEach(() => {
  db = createTestDatabase();
  service = new BibleService(new SqliteBibleRepository(db));
});
afterEach(() => db.close());
it("imports one local RVR1960, retains attribution and replaces it without duplicating verses", () => {
  expect(service.status().isImported).toBe(false);
  expect(() => service.chapter({ bookId: "JHN", chapter: 3 })).toThrow("Importa una Biblia");
  const first = service.importXml(bibleSampleXml());
  expect(first).toMatchObject({ isImported: true, verseCount: 1224, copyright: "Aviso de prueba" });
  const chapter = service.chapter({ bookId: "JHN", chapter: 3 });
  expect(chapter.verses).toHaveLength(36);
  expect(chapter.verses[15]).toEqual({ number: 16, text: "Texto de prueba JHN 3:16" });
  service.importXml(
    bibleSampleXml().replace("Texto de prueba JHN 3:16", "Texto revisado &amp; válido"),
  );
  expect(service.status().verseCount).toBe(first.verseCount);
  expect(service.chapter({ bookId: "JHN", chapter: 3 }).verses[15].text).toBe(
    "Texto revisado & válido",
  );
});
it("rejects missing translation names, incomplete books, wrong numbering, nested markup and DTDs without losing existing data", () => {
  const xml = bibleSampleXml();
  service.importXml(xml);
  for (const invalid of [
    xml.replace('translation="Spanish RVR 1960"', 'translation=""'),
    xml.replace('<book number="1">', '<book number="2">'),
    xml.replace('<chapter number="1">', '<chapter number="0">'),
    xml.replace("Texto de prueba GEN 1:1", "<script>texto</script>"),
    xml.replace("</bible>", ""),
    '<!DOCTYPE bible [<!ENTITY sample "boom">]>' + xml,
    '<bible translation="RVR1960"/>',
  ])
    expect(() => service.importXml(invalid)).toThrow("formato XML compatible");
  expect(service.chapter({ bookId: "JHN", chapter: 3 }).verses[15].text).toBe(
    "Texto de prueba JHN 3:16",
  );
  expect(() => service.chapter({ bookId: "JHN", chapter: 22 })).toThrow();
  expect(() => service.chapter({ bookId: "BAD", chapter: 1 })).toThrow("Revisa los campos");
});
it("preserves plain verse text and refuses oversized XML", () => {
  expect(parseBibleXml(bibleSampleXml()).verses[0].text).toBe("Texto de prueba GEN 1:1");
  expect(() => parseBibleXml("x".repeat(16 * 1024 * 1024 + 1))).toThrow("formato XML compatible");
});

it("keeps translations separate, persists selection and only replaces the matching edition", () => {
  service.importXml(bibleSampleXml());
  service.importXml(
    bibleSampleXml()
      .replace("Spanish RVR 1960", "Reina-Valera 1909")
      .replace("Texto de prueba JHN 3:16", "Texto 1909"),
  );
  service.importXml(
    bibleSampleXml()
      .replace("Spanish RVR 1960", "Nueva Versión Internacional")
      .replace("Texto de prueba JHN 3:16", "Texto NVI"),
  );
  expect(
    service
      .status()
      .translations.map((entry) => entry.code)
      .sort(),
  ).toEqual(["nvi", "rvr1909", "rvr1960"]);
  expect(service.status().selectedTranslation).toBe("rvr1960");
  service.select("nvi");
  expect(new BibleService(new SqliteBibleRepository(db)).status().selectedTranslation).toBe("nvi");
  expect(service.chapter({ bookId: "JHN", chapter: 3 }).verses[15].text).toBe("Texto NVI");
  expect(
    service.chapter({ translation: "rvr1909", bookId: "JHN", chapter: 3 }).verses[15].text,
  ).toBe("Texto 1909");
  service.importXml(bibleSampleXml().replace("Texto de prueba JHN 3:16", "Revisión 1960"));
  expect(service.status().translations).toHaveLength(3);
  expect(service.status().selectedTranslation).toBe("nvi");
  expect(service.chapter({ bookId: "JHN", chapter: 3 }).verses[15].text).toBe("Texto NVI");
  expect(() => service.select("missing")).toThrow("no está importada");
  expect(() => service.chapter({ translation: "missing", bookId: "JHN", chapter: 3 })).toThrow();
});
it("retains the name and attribution of other compatible XML translations", () => {
  const imported = parseBibleXml(bibleSampleXml().replace("Spanish RVR 1960", "Otra traducción"));
  expect(imported.name).toBe("Otra traducción");
  expect(imported.copyright).toBe("Aviso de prueba");
  expect(imported.code).toMatch(/^[a-f0-9]{20}$/);
});
