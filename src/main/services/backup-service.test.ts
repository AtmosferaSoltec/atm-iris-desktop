import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, readdir, rm, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createId } from "@shared/id";
import { createIrisHome, type IrisHome } from "../files/iris-home";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { SqliteMediaRepository } from "../repositories/sqlite/media-repository";
import { SqliteSongsRepository } from "../repositories/sqlite/songs-repository";
import { SqliteMaintenanceRepository } from "../repositories/sqlite/maintenance-repository";
import { SqliteSettingsRepository } from "../repositories/sqlite/settings-repository";
import { SqlitePlanRepository } from "../repositories/sqlite/plan-repository";
import { MediaService } from "./media-service";
import { BackupService } from "./backup-service";
import { SnapshotService } from "./snapshot-service";
import { StorageService } from "./storage-service";

let db: SqliteDatabase;
let home: IrisHome;
let songs: SqliteSongsRepository;
let assets: SqliteMediaRepository;
let maintenance: SqliteMaintenanceRepository;
let media: MediaService;
let backup: BackupService;
let settings: SqliteSettingsRepository;
let trashed: string[];
beforeEach(async () => {
  home = createIrisHome(await mkdtemp(join(tmpdir(), "iris-backup-test-")));
  db = createTestDatabase();
  settings = new SqliteSettingsRepository(db);
  settings.initialize("America/Lima");
  assets = new SqliteMediaRepository(db);
  songs = new SqliteSongsRepository(db, assets);
  maintenance = new SqliteMaintenanceRepository(db, songs);
  trashed = [];
  media = new MediaService(assets, home, async (path) => {
    trashed.push(path);
    await unlink(path);
  });
  backup = new BackupService(maintenance, songs, assets, media);
});
afterEach(async () => {
  db.close();
  await rm(home.root, { recursive: true, force: true });
});
it("round trips the web backup format, skips normalized duplicates and track-only songs", async () => {
  songs.save(createId(), {
    title: "Grácia",
    author: "Autor",
    sections: [{ label: "Coro", text: "Texto" }],
    audioId: null,
  });
  const file = backup.export();
  expect(backup.import(file)).toEqual({ songs: 0, skipped: 1, withoutLyrics: 0 });
  await backup.erase({ songs: true, media: false, confirm: "ELIMINAR" });
  expect(backup.import(file)).toEqual({ songs: 1, skipped: 0, withoutLyrics: 0 });
  expect(
    backup.import({
      ...file,
      songs: [
        { ...file.songs[0], title: "GRACIA" },
        { title: "Pista", author: "", sections: [], youtubeId: null },
      ],
      youtubeVideos: [],
    }),
  ).toMatchObject({ skipped: 1, withoutLyrics: 1 });
  expect(backup.export().songs[0].sections).toEqual(file.songs[0].sections);
});
it("rejects an invalid file before importing any content and requires typed erase confirmation", async () => {
  expect(() => backup.import({ format: "wrong", version: 1 })).toThrow(
    "Ese archivo no es un respaldo de Iris.",
  );
  expect(() =>
    backup.import({ format: "iris-backup", version: 1, songs: [{ title: "Invalid" }] }),
  ).toThrow("Ese archivo");
  await expect(
    backup.erase({ songs: true, media: false, confirm: "wrong" as "ELIMINAR" }),
  ).rejects.toMatchObject({
    code: "VALIDATION_FAILED",
    fields: { confirm: "Escribe ELIMINAR para confirmar." },
  });
  expect(maintenance.songs()).toEqual([]);
});
it("detects orphan files, preserves referenced files, trashes erase files and cleans the plan", async () => {
  await writeFile(home.resolveInside("Audio/pista.mp3"), "audio");
  await writeFile(home.resolveInside("Images/imagen.png"), "image");
  await media.scan();
  const audio = assets.all().find(({ asset }) => asset.kind === "audio")!.asset;
  const image = assets.all().find(({ asset }) => asset.kind === "image")!.asset;
  expect(maintenance.unusedIds()).toContain(audio.id);
  const song = songs.save(createId(), {
    title: "Pista",
    author: "",
    sections: [],
    audioId: audio.id,
  });
  const plan = new SqlitePlanRepository(db);
  plan.add("song", song.id);
  plan.add("media", image.id);
  expect(maintenance.unusedIds()).toEqual([]);
  expect(
    (await new StorageService(maintenance, assets, home).get()).folders.find(
      (folder) => folder.name === "Audio",
    )?.bytes,
  ).toBe(5);
  expect(await backup.erase({ songs: true, media: true, confirm: "ELIMINAR" })).toEqual({
    songs: 1,
    media: 1,
  });
  expect(trashed).toHaveLength(2);
  expect(plan.list()).toEqual([]);
});
it("creates at most one automatic snapshot per church day, retains seven and keeps manual snapshots", async () => {
  const snapshots = new SnapshotService(maintenance, settings, home);
  expect(snapshots.create(false, new Date("2026-10-25T02:00:00Z"))).toBe("iris-2026-10-24.db");
  expect(snapshots.create(false, new Date("2026-10-25T04:00:00Z"))).toBeNull();
  for (let day = 25; day <= 31; day++)
    snapshots.create(false, new Date(`2026-10-${day}T12:00:00Z`));
  const manual = snapshots.create(true, new Date("2026-10-31T13:00:00Z"));
  const files = await readdir(home.backupsDir);
  expect(files).toHaveLength(7);
  expect(files).toContain(manual);
  expect(files).not.toContain("iris-2026-10-24.db");
  expect(snapshots.create(false, new Date("2026-10-31T14:00:00Z"))).toBeNull();
});
