import { AppError, parseInput } from "@shared/errors";
import { createId } from "@shared/id";
import type { Song } from "@shared/domain/models";
import { songInputSchema } from "@shared/schemas/songs";
import type { SongsRepository, MediaRepository } from "../repositories/types";
import type { MediaService } from "./media-service";
import { lookUpYouTube } from "./youtube-oembed";

export type SavedSong = { song: Song; warning?: string };
export class SongsService {
  constructor(
    private readonly repository: SongsRepository,
    private readonly media: MediaRepository,
    private readonly mediaService: MediaService,
    private readonly checkYouTube = lookUpYouTube,
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
    let warning: string | undefined;
    if (input.youtubeId && input.youtubeId !== previous?.youtubeId) {
      const result = await this.checkYouTube(input.youtubeId);
      if (result.error && !result.isOffline)
        throw new AppError("VALIDATION_FAILED", result.error, { youtubeId: result.error });
      warning = result.isOffline ? result.error : undefined;
    }
    return { song: this.repository.save(id ?? createId(), input), ...(warning ? { warning } : {}) };
  }
  async delete(id: string, deleteAudio = false): Promise<void> {
    const song = this.get(id);
    if (deleteAudio && song.audio) await this.mediaService.delete(song.audio.id);
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
