import { localAssetUrl } from "@shared/lib/asset-url";
import type { ConsoleData, ConsoleItem } from "@shared/domain/console";
import type { PlanItemKind } from "@shared/domain/models";
import { MEDIA_BACKGROUND_COLORS } from "@shared/domain/projection";
import { mediaEntry, songEntry, sortEntries } from "@shared/domain/library-entries";
import { songListSchema } from "@shared/schemas/songs";
import { AppError } from "@shared/errors";
import { clock } from "@shared/lib/format";
import { parseLyrics } from "@shared/lib/lyrics";
import type {
  MediaRepository,
  PlanRepository,
  SettingsRepository,
  SongsRepository,
} from "../repositories/types";
import type { TimingService } from "./timing-service";
import type { SongsService } from "./songs-service";

export class ConsoleService {
  constructor(
    private readonly plan: PlanRepository,
    private readonly songs: SongsRepository,
    private readonly media: MediaRepository,
    private readonly settings: SettingsRepository,
    private readonly songService: SongsService,
    private readonly timing?: TimingService,
  ) {}
  item(kind: PlanItemKind, refId: string, planItemId: string): ConsoleItem {
    if (kind === "song") {
      const song = this.songService.get(refId);
      const asset = song.audio ? this.media.get(song.audio.id)?.asset : null;
      const file =
        asset && !asset.isMissing
          ? {
              id: asset.id,
              url: localAssetUrl(asset),
              durationSeconds: asset.durationSeconds,
            }
          : null;
      return {
        planItemId,
        refId,
        kind: song.sections.length === 0 && song.audio ? "track" : "song",
        title: song.title,
        subtitle: song.author || null,
        slides: song.sections,
        file,
        backgroundId: song.backgroundId,
      };
    }
    const entry = kind === "media" ? this.media.get(refId) : null;
    if (!entry || entry.asset.kind === "audio")
      throw new AppError("NOT_FOUND", "Ese medio no existe.");
    const asset = entry.asset;
    return {
      planItemId,
      refId,
      kind: asset.kind === "video" ? "video" : "image",
      title: asset.title,
      subtitle:
        asset.kind === "video" && asset.durationSeconds !== null
          ? `Video · ${clock(asset.durationSeconds)}`
          : null,
      slides: [],
      file: asset.isMissing
        ? null
        : {
            id: asset.id,
            url: localAssetUrl(asset),
            durationSeconds: asset.durationSeconds,
          },
    };
  }
  add(kind: PlanItemKind, refId: string): ConsoleItem {
    this.item(kind, refId, "");
    const row = this.plan.add(kind, refId);
    return this.item(kind, refId, row.id);
  }
  move(id: string, position: number): void {
    this.plan.move(id, position);
  }
  remove(id: string): void {
    this.plan.remove(id);
  }
  clear(): void {
    this.plan.clear();
  }
  load(): ConsoleData {
    const settings = this.settings.get();
    const songs = [];
    for (let page = 1; ; page++) {
      const result = this.songs.list(songListSchema.parse({ page, limit: 100 }));
      songs.push(...result.data);
      if (page >= result.meta.totalPages) break;
    }
    const assets = this.media.all().map((entry) => entry.asset);
    return {
      churchName: settings.church.name,
      timeZone: settings.church.timezone,
      projection: settings.projection,
      items: this.plan.list().map((row) => this.item(row.kind, row.refId, row.id)),
      library: sortEntries([
        ...songs.map(songEntry),
        ...assets
          .filter((asset) => asset.role === "library" && !asset.isMissing)
          .map((asset) => mediaEntry(asset, asset.isMissing ? null : localAssetUrl(asset))),
      ]),
      backgrounds: assets
        .filter((asset) => asset.isBackground && !asset.isMissing && !asset.needsMeasures)
        .map((asset) => ({
          id: asset.id,
          name: asset.title,
          colors: MEDIA_BACKGROUND_COLORS,
          ...(asset.kind === "video"
            ? { videoUrl: localAssetUrl(asset), durationSeconds: asset.durationSeconds }
            : { imageUrl: localAssetUrl(asset) }),
        })),
      sounds: assets
        .filter((asset) => asset.role === "sound" && !asset.isMissing)
        .map((asset) => ({ id: asset.id, title: asset.title, icon: asset.soundIcon ?? "music" })),
      serviceTypes: this.timing?.serviceTypes() ?? [],
      people: this.timing?.people() ?? [],
      inProgress:
        this.timing?.repository.records().find((record) => record.status === "inProgress") ?? null,
      selectedServiceTypeId: this.timing?.selectedService() ?? null,
    };
  }
  setDefaultBackground(id: string | null): void {
    if (id !== null) {
      const entry = this.media.get(id);
      if (!entry || !entry.asset.isBackground || entry.asset.isMissing || entry.asset.needsMeasures)
        throw new AppError("NOT_FOUND", "Ese fondo no existe.");
    }
    this.settings.updateProjection({ ...this.settings.get().projection, defaultBackgroundId: id });
  }
  async editSlide(
    songId: string,
    index: number,
    previousText: string,
    text: string,
  ): Promise<ConsoleItem> {
    const song = this.songService.get(songId);
    const section = song.sections[index];
    if (!section || section.text !== previousText)
      throw new AppError(
        "CONFLICT",
        "La diapositiva cambió. Abre la canción e inténtalo de nuevo.",
      );
    const replacement = parseLyrics(text);
    if (replacement[0] && !replacement[0].label) replacement[0].label = section.label;
    await this.songService.save(songId, {
      title: song.title,
      author: song.author,
      sections: [
        ...song.sections.slice(0, index),
        ...replacement,
        ...song.sections.slice(index + 1),
      ],
      audioId: song.audio?.id ?? null,
      backgroundId: song.backgroundId,
    });
    return this.item("song", songId, "");
  }
}
