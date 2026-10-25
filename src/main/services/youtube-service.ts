import type { YoutubeVideo } from "@shared/domain/models";
import { AppError, parseInput } from "@shared/errors";
import { youTubeVideoId } from "@shared/lib/youtube";
import { youtubeLinkSchema } from "@shared/schemas/youtube";
import type { YoutubeRepository } from "../repositories/sqlite/youtube-repository";
import { lookUpYouTube } from "./youtube-oembed";

export class YoutubeService {
  constructor(
    readonly repository: YoutubeRepository,
    private readonly check = lookUpYouTube,
  ) {}
  get(id: string): YoutubeVideo {
    const video = this.repository.get(id);
    if (!video) throw new AppError("NOT_FOUND", "No encontramos ese video de YouTube.");
    return video;
  }
  async create(link: string): Promise<YoutubeVideo> {
    const videoId = youTubeVideoId(parseInput(youtubeLinkSchema, link))!;
    const existing = this.repository.list().find((video) => video.videoId === videoId);
    if (existing) return existing;
    const result = await this.check(videoId);
    if (!result.video)
      throw new AppError(
        "VALIDATION_FAILED",
        result.isOffline
          ? "Sin conexión. Los videos de YouTube necesitan internet."
          : (result.error ?? "YouTube no pudo reproducir este video."),
      );
    return this.repository.save(result.video);
  }
  delete(id: string): void {
    this.get(id);
    this.repository.delete(id);
  }
}
