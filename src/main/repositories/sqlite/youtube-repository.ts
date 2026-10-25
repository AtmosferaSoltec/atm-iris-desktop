import type { YoutubeVideo } from "@shared/domain/models";
import { createId } from "@shared/id";
import type { SqliteDatabase, SqlRow } from "../../db/sqlite";

type VideoRow = SqlRow & {
  id: string;
  video_id: string;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
};
export interface YoutubeRepository {
  list(): YoutubeVideo[];
  get(id: string): YoutubeVideo | null;
  save(input: { videoId: string; title: string; author: string }): YoutubeVideo;
  delete(id: string): void;
}
export class SqliteYoutubeRepository implements YoutubeRepository {
  constructor(private readonly db: SqliteDatabase) {}
  list(): YoutubeVideo[] {
    return this.db
      .prepare<VideoRow>("SELECT * FROM youtube_videos ORDER BY title,id")
      .all()
      .map((row) => ({
        id: row.id,
        videoId: row.video_id,
        title: row.title,
        author: row.author,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
  }
  get(id: string): YoutubeVideo | null {
    return this.list().find((video) => video.id === id) ?? null;
  }
  save(input: { videoId: string; title: string; author: string }): YoutubeVideo {
    const existing = this.list().find((video) => video.videoId === input.videoId);
    if (existing) return existing;
    const id = createId();
    const now = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO youtube_videos(id,video_id,title,author,created_at,updated_at) VALUES(?,?,?,?,?,?)",
      )
      .run(id, input.videoId, input.title, input.author, now, now);
    return this.get(id)!;
  }
  delete(id: string): void {
    this.db.prepare("DELETE FROM youtube_videos WHERE id=?").run(id);
  }
}
