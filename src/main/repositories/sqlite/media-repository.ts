import type { LocalMediaAsset, MediaKind, MediaRole } from "@shared/domain/models";
import type { SqliteDatabase, SqlRow } from "../../db/sqlite";
import type { MediaEntry, MediaRepository } from "../types";

type MediaRow = SqlRow & {
  id: string;
  kind: MediaKind;
  role: MediaRole;
  title: string;
  description: string | null;
  file_name: string;
  relative_path: string;
  content_type: string;
  size_bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  sound_icon: string | null;
  is_missing: number;
  is_import_pending: number;
  created_at: string;
  updated_at: string;
  file_modified_at: string | null;
};
function map(row: MediaRow): MediaEntry {
  const asset: LocalMediaAsset = {
    id: row.id,
    fileModifiedAt: row.file_modified_at,
    kind: row.kind,
    role: row.role,
    title: row.title,
    description: row.description,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    durationSeconds: row.duration_seconds,
    width: row.width,
    height: row.height,
    soundIcon: row.sound_icon,
    isBackground: row.role === "background",
    isMissing: Boolean(row.is_missing),
    needsMeasures:
      row.kind === "image"
        ? row.width === null || row.height === null
        : row.duration_seconds === null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return {
    asset,
    relativePath: row.relative_path,
    isImportPending: Boolean(row.is_import_pending),
  };
}
export class SqliteMediaRepository implements MediaRepository {
  constructor(private readonly db: SqliteDatabase) {}
  isReferenced(id: string, excludingSongId = ""): boolean {
    return Boolean(
      this.db
        .prepare(
          `SELECT 1 AS used WHERE EXISTS (SELECT 1 FROM songs WHERE id<>? AND (audio_id=? OR background_id=?)) OR EXISTS (SELECT 1 FROM service_plan_items WHERE kind='media' AND ref_id=?) OR EXISTS (SELECT 1 FROM projection_settings WHERE default_background_id=?)`,
        )
        .get(excludingSongId, id, id, id, id),
    );
  }
  all(): MediaEntry[] {
    return this.db
      .prepare<MediaRow>("SELECT * FROM media_assets ORDER BY created_at DESC,id")
      .all()
      .map(map);
  }
  get(id: string): MediaEntry | null {
    const row = this.db.prepare<MediaRow>("SELECT * FROM media_assets WHERE id=?").get(id);
    return row ? map(row) : null;
  }
  insert(entry: MediaEntry): void {
    const a = entry.asset;
    this.db
      .prepare(
        "INSERT INTO media_assets(id,kind,role,title,description,file_name,relative_path,content_type,size_bytes,duration_seconds,width,height,sound_icon,is_missing,is_import_pending,created_at,updated_at,file_modified_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        a.id,
        a.kind,
        a.role,
        a.title,
        a.description,
        a.fileName,
        entry.relativePath,
        a.contentType,
        a.sizeBytes,
        a.durationSeconds,
        a.width,
        a.height,
        a.soundIcon,
        Number(a.isMissing),
        Number(entry.isImportPending),
        a.createdAt,
        a.updatedAt,
        a.fileModifiedAt ?? null,
      );
  }
  update(entry: MediaEntry): void {
    const a = entry.asset;
    this.db
      .prepare(
        "UPDATE media_assets SET file_name=?,role=?,title=?,description=?,relative_path=?,size_bytes=?,duration_seconds=?,width=?,height=?,sound_icon=?,is_missing=?,is_import_pending=?,updated_at=?,file_modified_at=? WHERE id=?",
      )
      .run(
        a.fileName,
        a.role,
        a.title,
        a.description,
        entry.relativePath,
        a.sizeBytes,
        a.durationSeconds,
        a.width,
        a.height,
        a.soundIcon,
        Number(a.isMissing),
        Number(entry.isImportPending),
        new Date().toISOString(),
        a.fileModifiedAt ?? null,
        a.id,
      );
  }
  delete(id: string): void {
    this.db.transaction(() => {
      this.db
        .prepare(
          "UPDATE projection_settings SET default_background_id=NULL WHERE default_background_id=?",
        )
        .run(id);
      this.db.prepare("DELETE FROM media_assets WHERE id=?").run(id);
    });
  }
}
