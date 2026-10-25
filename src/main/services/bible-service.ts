import { readFile, stat } from "node:fs/promises";
import { AppError, parseInput } from "@shared/errors";
import type { BibleChapter, BibleStatus } from "@shared/domain/bible";
import { bibleChapterSchema } from "@shared/schemas/bible";
import type { SqliteBibleRepository } from "../repositories/sqlite/bible-repository";
import { MAX_BIBLE_BYTES, parseBibleXml } from "./bible-xml";

export class BibleService {
  constructor(private readonly repository: SqliteBibleRepository) {}
  status(): BibleStatus {
    return this.repository.status();
  }
  async importFile(path: string): Promise<BibleStatus> {
    const info = await stat(path);
    if (!info.isFile() || info.size > MAX_BIBLE_BYTES)
      throw new AppError("VALIDATION_FAILED", "Elige un archivo XML de RVR1960 de hasta 16 MB.");
    return this.importXml(await readFile(path, "utf8"));
  }
  importXml(xml: string): BibleStatus {
    return this.repository.replace(parseBibleXml(xml));
  }
  chapter(raw: unknown): BibleChapter {
    const input = parseInput(bibleChapterSchema, raw);
    if (!this.status().isImported)
      throw new AppError("NOT_FOUND", "Importa la Biblia RVR1960 para proyectar versículos.");
    const chapter = this.repository.chapter(input.bookId, input.chapter);
    if (!chapter.verses.length) throw new AppError("NOT_FOUND", "Ese capítulo no existe.");
    return chapter;
  }
}
