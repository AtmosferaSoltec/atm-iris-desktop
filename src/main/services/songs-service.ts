import { AppError, parseInput } from "@shared/errors";
import { createId } from "@shared/id";
import type { Song } from "@shared/domain/models";
import { songInputSchema } from "@shared/schemas/songs";
import type { SongsRepository, MediaRepository } from "../repositories/types";
import type { MediaService } from "./media-service";

export type SavedSong = { song: Song; warning?: string };
export class SongsService {
  constructor(
    private readonly repository: SongsRepository,
    private readonly media: MediaRepository,
    private readonly mediaService: MediaService,
  ) {}
  get(id: string): Song {
    const song = this.repository.get(id);
    if (!song) throw new AppError("NOT_FOUND", "No encontramos la canción.");
    return song;
  }
  async save(id: string | null, raw: unknown): Promise<SavedSong> {
    const input = parseInput(songInputSchema, raw);
    const previous = id ? this.get(id) : null;
    if (input.audioId) {
      const audio = this.media.get(input.audioId);
      if (!audio || audio.asset.kind !== "audio" || audio.asset.role !== "track")
        throw new AppError("VALIDATION_FAILED", "Revisa los datos enviados.", {
          audioId: "Esa pista no existe.",
        });
      if (!/\.mp3$/i.test(audio.asset.fileName) && previous?.audio?.id !== input.audioId)
        throw new AppError("VALIDATION_FAILED", "Revisa los datos enviados.", {
          audioId: "Elige un archivo MP3.",
        });
      const owner = this.repository.audioOwner(input.audioId);
      if (owner && owner !== id)
        throw new AppError("VALIDATION_FAILED", "Revisa los datos enviados.", {
          audioId: "Esa pista ya es de otra canción.",
        });
    }
    if (input.backgroundId) {
      const background = this.media.get(input.backgroundId);
      if (
        !background ||
        !background.asset.isBackground ||
        background.asset.isMissing ||
        background.asset.needsMeasures
      )
        throw new AppError("VALIDATION_FAILED", "Revisa los datos enviados.", {
          backgroundId: "Ese fondo no existe.",
        });
    }
    const song = this.repository.save(id ?? createId(), input);
    let warning: string | undefined;
    if (previous?.audio && previous.audio.id !== input.audioId) {
      try {
        await this.mediaService.deleteUnusedTrack(previous.audio.id);
      } catch {
        warning =
          "La canción se guardó, pero no pudimos enviar el audio anterior a la papelera. Puedes quitarlo desde Configuración → Almacenamiento.";
      }
    }
    return { song, ...(warning ? { warning } : {}) };
  }
  async delete(id: string): Promise<void> {
    const song = this.get(id);
    if (song.audio) await this.mediaService.deleteUnusedTrack(song.audio.id, id);
    this.repository.delete(id);
  }
  archive(id: string, isArchived: boolean): Song {
    this.get(id);
    return this.repository.archive(id, isArchived);
  }
  markUsed(id: string): void {
    this.get(id);
    this.repository.markUsed(id);
  }
}
