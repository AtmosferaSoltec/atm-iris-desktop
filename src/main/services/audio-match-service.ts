import { AppError, parseInput } from "@shared/errors";
import { createId } from "@shared/id";
import { matchAudios } from "@shared/lib/audio-match";
import {
  audioMatchConfirmSchema,
  type AudioMatchPreview,
  type AudioMatchResult,
} from "@shared/schemas/audio-match";
import type { SqliteMaintenanceRepository } from "../repositories/sqlite/maintenance-repository";
import type { MediaRepository, SongsRepository } from "../repositories/types";

type Pending = { token: string };

/** Gives a track to every song that has none, by comparing names with the MP3s in Iris/Audio. */
export class AudioMatchService {
  private pending: Pending | null = null;
  constructor(
    private readonly maintenance: Pick<
      SqliteMaintenanceRepository,
      "songs" | "setSongAudio" | "importTransaction"
    >,
    private readonly media: MediaRepository,
    private readonly songs: Pick<SongsRepository, "audioOwner">,
    private readonly scan: () => Promise<unknown>,
  ) {}

  /** Tracks that are in Iris/Audio, are MP3, exist and belong to no song. */
  private freeTracks(): { id: string; fileName: string }[] {
    return this.media
      .all()
      .map(({ asset }) => asset)
      .filter(
        (asset) =>
          asset.kind === "audio" &&
          asset.role === "track" &&
          !asset.isMissing &&
          /\.mp3$/i.test(asset.fileName) &&
          !this.songs.audioOwner(asset.id),
      )
      .map((asset) => ({ id: asset.id, fileName: asset.fileName }));
  }

  async preview(): Promise<AudioMatchPreview> {
    await this.scan();
    const songs = this.maintenance.songs().filter((song) => !song.audio && !song.archivedAt);
    const files = this.freeTracks();
    const matched = matchAudios(songs, files);
    const songById = new Map(songs.map((song) => [song.id, song]));
    const fileById = new Map(files.map((file) => [file.id, file]));
    const usedSongs = new Set(matched.map((match) => match.songId));
    const usedFiles = new Set(matched.map((match) => match.fileId));
    this.pending = { token: createId() };
    const byTitle = (a: { title: string }, b: { title: string }): number =>
      a.title.localeCompare(b.title, "es");
    return {
      token: this.pending.token,
      matches: matched
        .map((match) => ({
          songId: match.songId,
          fileId: match.fileId,
          isSure: match.isSure,
          title: songById.get(match.songId)!.title,
          author: songById.get(match.songId)!.author,
          fileName: fileById.get(match.fileId)!.fileName,
        }))
        .sort(byTitle),
      unmatchedSongs: songs
        .filter((song) => !usedSongs.has(song.id))
        .map(({ id, title, author }) => ({ songId: id, title, author }))
        .sort(byTitle),
      unmatchedFiles: files
        .filter((file) => !usedFiles.has(file.id))
        .sort((a, b) => a.fileName.localeCompare(b.fileName, "es")),
    };
  }

  confirm(raw: unknown): AudioMatchResult {
    const { token, pairs } = parseInput(audioMatchConfirmSchema, raw);
    const pending = this.pending;
    if (!pending || pending.token !== token)
      throw new AppError("CONFLICT", "La vista previa venció. Busca las coincidencias otra vez.");
    this.pending = null;
    return this.maintenance.importTransaction(() => {
      const free = new Set(this.freeTracks().map((file) => file.id));
      const songs = new Map(this.maintenance.songs().map((song) => [song.id, song]));
      const result: AudioMatchResult = { assigned: 0, skipped: 0 };
      const usedSongs = new Set<string>();
      for (const { songId, fileId } of pairs) {
        // The library may have changed since the preview: only assign what is still free.
        if (
          usedSongs.has(songId) ||
          !free.has(fileId) ||
          !songs.get(songId) ||
          songs.get(songId)?.audio
        ) {
          result.skipped++;
          continue;
        }
        this.maintenance.setSongAudio(songId, fileId);
        usedSongs.add(songId);
        free.delete(fileId);
        result.assigned++;
      }
      return result;
    });
  }
}
