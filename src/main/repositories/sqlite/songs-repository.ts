import type { z } from "@shared/zod";
import type { Paginated, Song, SongSummary } from "@shared/domain/models";
import { createId } from "@shared/id";
import { nameKey } from "@shared/lib/text";
import { firstLine } from "@shared/lib/lyrics";
import type { songListSchema, SongInput } from "@shared/schemas/songs";
import type { SqliteDatabase, SqlRow, SqlValue } from "../../db/sqlite";
import type { MediaRepository, SongsRepository } from "../types";

type SongRow = SqlRow & {
  id: string;
  title: string;
  author: string;
  audio_id: string | null;
  youtube_id: string | null;
  background_id: string | null;
  last_used_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};
export class SqliteSongsRepository implements SongsRepository {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly media: MediaRepository,
  ) {}
  get(id: string): Song | null {
    const row = this.db.prepare<SongRow>("SELECT * FROM songs WHERE id=?").get(id);
    if (!row) return null;
    const sections = this.db
      .prepare<{ id: string; label: string | null; text: string }>(
        "SELECT id,label,text FROM song_sections WHERE song_id=? ORDER BY position",
      )
      .all(id);
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      sections,
      audio: row.audio_id ? (this.media.get(row.audio_id)?.asset ?? null) : null,
      youtubeId: row.youtube_id,
      backgroundId: row.background_id,
      lastUsedAt: row.last_used_at,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  list(input: z.infer<typeof songListSchema>): Paginated<SongSummary> {
    const key = nameKey(input.search);
    const pattern = `%${key.replace(/[\\%_]/g, "\\$&")}%`;
    const where = `archived_at IS ${input.archived ? "NOT " : ""}NULL${key ? " AND search_text LIKE ? ESCAPE '\\'" : ""}`;
    const parameters: SqlValue[] = key ? [pattern] : [];
    const total = Number(
      this.db.prepare(`SELECT COUNT(*) AS total FROM songs WHERE ${where}`).get(...parameters)
        ?.total ?? 0,
    );
    // LIKE narrows candidates; the web's title/author/lyrics relevance stays exact in JavaScript.
    const songs = this.db
      .prepare<{ id: string }>(`SELECT id FROM songs WHERE ${where}`)
      .all(...parameters)
      .map((row) => this.get(row.id)!);
    const relevance = (song: Song): number =>
      nameKey(song.title).includes(key) ? 3 : nameKey(song.author).includes(key) ? 2 : 1;
    songs.sort(
      (a, b) =>
        (key
          ? relevance(b) - relevance(a)
          : input.sort === "-updatedAt"
            ? b.updatedAt.localeCompare(a.updatedAt)
            : 0) ||
        a.title.localeCompare(b.title, "es", { sensitivity: "base" }) ||
        a.id.localeCompare(b.id),
    );
    return {
      data: songs.slice((input.page - 1) * input.limit, input.page * input.limit).map((song) => ({
        id: song.id,
        title: song.title,
        author: song.author,
        sectionCount: song.sections.length,
        firstLine: firstLine(song.sections),
        audio: song.audio,
        youtubeId: song.youtubeId,
        backgroundId: song.backgroundId,
        archivedAt: song.archivedAt,
        lastUsedAt: song.lastUsedAt,
        updatedAt: song.updatedAt,
      })),
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  }
  save(id: string, input: SongInput, isTransactionOpen = false): Song {
    const previous = this.get(id);
    const now = new Date().toISOString();
    const search = nameKey(
      [input.title, input.author, ...input.sections.map((section) => section.text)].join(" "),
    );
    const write = (): void => {
      if (previous)
        this.db
          .prepare(
            "UPDATE songs SET title=?,author=?,audio_id=?,youtube_id=?,background_id=?,search_text=?,updated_at=? WHERE id=?",
          )
          .run(
            input.title,
            input.author,
            input.audioId,
            input.youtubeId,
            input.backgroundId === undefined ? previous.backgroundId : input.backgroundId,
            search,
            now,
            id,
          );
      else
        this.db
          .prepare(
            "INSERT INTO songs(id,title,author,audio_id,youtube_id,background_id,search_text,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
          )
          .run(
            id,
            input.title,
            input.author,
            input.audioId,
            input.youtubeId,
            input.backgroundId ?? null,
            search,
            now,
            now,
          );
      this.db.prepare("DELETE FROM song_sections WHERE song_id=?").run(id);
      for (const [position, section] of input.sections.entries())
        this.db
          .prepare("INSERT INTO song_sections(id,song_id,position,label,text) VALUES(?,?,?,?,?)")
          .run(createId(), id, position, section.label, section.text);
    };
    if (isTransactionOpen) write();
    else this.db.transaction(write);
    return this.get(id)!;
  }
  delete(id: string): void {
    this.db.prepare("DELETE FROM songs WHERE id=?").run(id);
  }
  archive(id: string, isArchived: boolean): Song {
    this.db
      .prepare("UPDATE songs SET archived_at=?,updated_at=? WHERE id=?")
      .run(isArchived ? new Date().toISOString() : null, new Date().toISOString(), id);
    return this.get(id)!;
  }
  markUsed(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE songs SET last_used_at=?,updated_at=? WHERE id=?").run(now, now, id);
  }
  audioOwner(audioId: string): string | null {
    return (
      this.db.prepare<{ id: string }>("SELECT id FROM songs WHERE audio_id=?").get(audioId)?.id ??
      null
    );
  }
}
