import type { z } from "@shared/zod";
import { AppError, parseInput } from "@shared/errors";
import { createId } from "@shared/id";
import { nameKey } from "@shared/lib/text";
import {
  backupFileSchema,
  eraseSchema,
  type BackupFile,
  type ImportResult,
  type EraseResult,
} from "@shared/schemas/backup";
import { songInputSchema } from "@shared/schemas/songs";
import type { SqliteMaintenanceRepository } from "../repositories/sqlite/maintenance-repository";
import type { SongsRepository, MediaRepository } from "../repositories/types";
import type { MediaService } from "./media-service";

export class BackupService {
  constructor(
    private readonly repository: SqliteMaintenanceRepository,
    private readonly songs: SongsRepository,
    private readonly assets: MediaRepository,
    private readonly media: MediaService,
  ) {}
  export(): BackupFile {
    return {
      format: "iris-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: this.repository.songs().map((song) => ({
        title: song.title,
        author: song.author,
        sections: song.sections.map(({ label, text }) => ({ label, text })),
      })),
    };
  }
  import(raw: unknown): ImportResult {
    const parsed = backupFileSchema.safeParse(raw);
    if (!parsed.success)
      throw new AppError("VALIDATION_FAILED", "Ese archivo no es un respaldo de Iris.");
    const file = parsed.data;
    return this.repository.importTransaction(() => {
      const key = (title: string, author: string): string =>
        `${nameKey(title)}\u0000${nameKey(author)}`;
      const seen = new Set(this.repository.songs().map((song) => key(song.title, song.author)));
      const result: ImportResult = { songs: 0, skipped: 0, withoutLyrics: 0 };
      for (const song of file.songs) {
        if (!song.sections.length) {
          result.withoutLyrics++;
          continue;
        }
        const songKey = key(song.title, song.author);
        if (seen.has(songKey)) {
          result.skipped++;
          continue;
        }
        this.repository.saveSong(
          createId(),
          songInputSchema.parse({ ...song, audioId: null, backgroundId: null }),
        );
        seen.add(songKey);
        result.songs++;
      }
      return result;
    });
  }
  async erase(raw: z.infer<typeof eraseSchema>): Promise<EraseResult> {
    const input = parseInput(eraseSchema, raw);
    const result: EraseResult = { songs: 0, media: 0 };
    if (input.songs) {
      for (const song of this.repository.songs()) {
        // Trash first: a failed filesystem action leaves that song available for retry.
        if (song.audio) await this.media.delete(song.audio.id);
        this.songs.delete(song.id);
        result.songs++;
      }
    }
    if (input.media)
      for (const { asset } of this.assets.all().filter(({ asset }) => asset.kind !== "audio")) {
        await this.media.delete(asset.id);
        result.media++;
      }
    return result;
  }
}
