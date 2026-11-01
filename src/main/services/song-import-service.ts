import { AppError, parseInput } from "@shared/errors";
import { createId } from "@shared/id";
import { LYRICS_LIMITS } from "@shared/lib/lyrics";
import { parseSongFile, type ImportedSong } from "@shared/lib/song-file";
import { nameKey } from "@shared/lib/text";
import { songInputSchema } from "@shared/schemas/songs";
import {
  songImportConfirmSchema,
  type SongImportItem,
  type SongImportPreview,
  type SongImportResult,
} from "@shared/schemas/song-import";
import type { SqliteMaintenanceRepository } from "../repositories/sqlite/maintenance-repository";

export type SongImportFile = { name: string; content: string };

type Pending = { token: string; songs: ImportedSong[] };

/** Songs from a file (Holyrics JSON or an Iris backup): a preview first, nothing is saved until the operator confirms. */
export class SongImportService {
  private pending: Pending | null = null;
  constructor(
    private readonly repository: Pick<
      SqliteMaintenanceRepository,
      "songs" | "saveSong" | "importTransaction"
    >,
  ) {}

  private static key(song: Pick<ImportedSong, "title" | "author">): string {
    return `${nameKey(song.title)}\u0000${nameKey(song.author)}`;
  }

  private static problem(song: ImportedSong): string | null {
    if (!song.title) return "No tiene título.";
    if (song.title.length > 120) return "El título es demasiado largo.";
    if (song.author.length > 120) return "El nombre del autor es demasiado largo.";
    if (!song.sections.length) return "No tiene letra.";
    if (song.sections.length > LYRICS_LIMITS.maxSections)
      return `Tiene más de ${LYRICS_LIMITS.maxSections} diapositivas.`;
    if (song.sections.some((section) => section.text.length > 2000))
      return "Una diapositiva es demasiado larga.";
    return null;
  }

  /** One or many files. With several, a file that is not a song file only shows up as a problem row. */
  preview(files: SongImportFile[], label: string): SongImportPreview {
    const songs: ImportedSong[] = [];
    const items: SongImportItem[] = [];
    const seen = new Set(this.repository.songs().map(SongImportService.key));
    for (const file of files) {
      let parsed: ImportedSong[];
      try {
        parsed = parseSongFile(file.content);
      } catch {
        if (files.length === 1)
          throw new AppError(
            "VALIDATION_FAILED",
            "Ese archivo no parece un archivo de canciones (JSON).",
          );
        items.push({
          title: file.name,
          author: "",
          slides: 0,
          status: "invalid",
          reason: "No es un archivo de canciones (JSON).",
        });
        continue;
      }
      for (const song of parsed) {
        songs.push(song);
        const base = {
          title: song.title || "(sin título)",
          author: song.author,
          slides: song.sections.length,
        };
        const problem = SongImportService.problem(song);
        if (problem) {
          items.push({ ...base, status: "invalid", reason: problem });
          continue;
        }
        const key = SongImportService.key(song);
        if (seen.has(key))
          items.push({ ...base, status: "duplicate", reason: "Ya existe una canción igual." });
        else {
          seen.add(key);
          items.push({ ...base, status: "new", reason: null });
        }
      }
    }
    if (!songs.length) throw new AppError("VALIDATION_FAILED", "No hay canciones en los archivos.");
    this.pending = { token: createId(), songs };
    return { token: this.pending.token, fileName: label, items };
  }

  confirm(raw: unknown): SongImportResult {
    const { token } = parseInput(songImportConfirmSchema, raw);
    const pending = this.pending;
    if (!pending || pending.token !== token)
      throw new AppError("CONFLICT", "La vista previa venció. Elige el archivo otra vez.");
    this.pending = null;
    return this.repository.importTransaction(() => {
      const seen = new Set(this.repository.songs().map(SongImportService.key));
      const result: SongImportResult = { imported: 0, duplicates: 0, invalid: 0 };
      for (const song of pending.songs) {
        if (SongImportService.problem(song)) {
          result.invalid++;
          continue;
        }
        const key = SongImportService.key(song);
        if (seen.has(key)) {
          result.duplicates++;
          continue;
        }
        this.repository.saveSong(
          createId(),
          songInputSchema.parse({ ...song, audioId: null, backgroundId: null }),
        );
        seen.add(key);
        result.imported++;
      }
      return result;
    });
  }

  cancel(): void {
    this.pending = null;
  }
}
