import { AppError, parseInput } from "@shared/errors";
import { createId } from "@shared/id";
import type { Song } from "@shared/domain/models";
import { songInputSchema } from "@shared/schemas/songs";
import type { TrackChoice } from "@shared/schemas/media";
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
  /**
   * Picks the file for a song's track. A track belongs to one song, so one already used by
   * another song is refused here, when it is chosen, not later when the song is saved.
   */
  async chooseTrack(path: string, songId?: string): Promise<TrackChoice> {
    const choice = await this.mediaService.chooseTrack(path);
    const owner = choice.isCopied ? null : this.repository.audioOwner(choice.asset.id);
    if (owner && owner !== songId) {
      const title = this.repository.get(owner)?.title;
      throw new AppError(
        "CONFLICT",
        title
          ? `Ese audio ya es de «${title}». Elige otro archivo o quítaselo primero a esa canción.`
          : "Ese audio ya es de otra canción. Elige otro archivo.",
      );
    }
    return choice;
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
