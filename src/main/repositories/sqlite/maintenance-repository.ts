import type { Song } from "@shared/domain/models";
import type { SqliteDatabase } from "../../db/sqlite";
import type { SqliteSongsRepository } from "./songs-repository";
import type { SongInput } from "@shared/schemas/songs";

export class SqliteMaintenanceRepository {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly songsRepository: SqliteSongsRepository,
  ) {}
  songs(): Song[] {
    return this.db
      .prepare<{ id: string }>("SELECT id FROM songs ORDER BY id")
      .all()
      .map(({ id }) => this.songsRepository.get(id)!);
  }
  saveSong(id: string, input: SongInput): void {
    this.songsRepository.save(id, input, true);
  }
  unusedIds(): string[] {
    return this.db
      .prepare<{ id: string }>(
        `SELECT id FROM media_assets AS asset WHERE role NOT IN ('background','sound')
      AND NOT EXISTS (SELECT 1 FROM songs WHERE audio_id=asset.id OR background_id=asset.id)
      AND NOT EXISTS (SELECT 1 FROM service_plan_items WHERE kind='media' AND ref_id=asset.id)
      AND NOT EXISTS (SELECT 1 FROM projection_settings WHERE default_background_id=asset.id)`,
      )
      .all()
      .map(({ id }) => id);
  }
  importTransaction<T>(operation: () => T): T {
    return this.db.transaction(operation);
  }
  snapshot(path: string): void {
    this.db.prepare("VACUUM INTO ?").run(path);
  }
}
