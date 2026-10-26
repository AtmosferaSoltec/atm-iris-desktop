import { expect, it } from "vitest";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createIrisHome } from "../files/iris-home";
import { SqliteSettingsRepository } from "../repositories/sqlite/settings-repository";
import { SqliteBibleRepository } from "../repositories/sqlite/bible-repository";
import { SqliteDatabase } from "./sqlite";
import { migrate, MIGRATIONS } from "./migrate";

it.each([8, 9, 10])(
  "upgrades schema %i on disk, preserves existing data and files, and keeps a restorable backup",
  (version) => {
    const home = createIrisHome(join(process.env.IRIS_HOME!, `upgrade-${version}`));
    const file = join(home.imagesDir, "existing.png");
    const bytes = Buffer.from("Existing user file");
    writeFileSync(file, bytes);
    let db = new SqliteDatabase(home.databasePath);
    try {
      migrate(
        db,
        home.backupsDir,
        MIGRATIONS.filter((migration) => migration.version <= version),
      );
      const settings = new SqliteSettingsRepository(db);
      settings.initialize("America/Lima");
      settings.updateChurch({ name: "Iglesia existente", timezone: "America/Lima" });
      db.exec(`
      INSERT INTO app_settings VALUES('selectedServiceType','null');
      INSERT INTO media_assets(id,kind,role,title,file_name,relative_path,content_type,size_bytes,created_at,updated_at)
      VALUES('image','image','library','Imagen existente','existing.png','Images/existing.png','image/png',18,'2026-01-01','2026-01-01');
      INSERT INTO songs(id,title,author,background_id,search_text,created_at,updated_at)
      VALUES('song','Canción existente','Autor','image','cancion existente','2026-01-01','2026-01-01');
      INSERT INTO song_sections VALUES('section','song',0,'Verso','Letra guardada');
      INSERT INTO youtube_videos VALUES('youtube','M7lc1UVf-VE','Video guardado','Autor','2026-01-01','2026-01-01');
      INSERT INTO service_plan_items VALUES('plan','song','song',0,'2026-01-01','2026-01-01');
      INSERT INTO service_records VALUES('record',NULL,'Culto anterior','finished','2026-01-01','2026-01-01','2026-01-01');
    `);
      if (version >= 9)
        db.exec(
          "INSERT INTO bible_metadata VALUES(1,'rvr1960','Aviso conservado','2026-01-01',1); INSERT INTO bible_verses VALUES('JHN',3,16,'Versículo guardado');",
        );
      const tables = [
        "church_settings",
        "projection_settings",
        "app_settings",
        "songs",
        "song_sections",
        "service_plan_items",
        "service_records",
      ];
      const before = tables.map((table) => db.prepare(`SELECT * FROM ${table}`).all());
      const mediaBefore = db.prepare("SELECT id,title,relative_path FROM media_assets").all();
      db.close();
      const oldBytes = readFileSync(home.databasePath);
      const backupsBefore = new Set(readdirSync(home.backupsDir));
      db = new SqliteDatabase(home.databasePath);
      migrate(db, home.backupsDir);
      expect(tables.map((table) => db.prepare(`SELECT * FROM ${table}`).all())).toEqual(before);
      expect(db.prepare("SELECT id,title,relative_path FROM media_assets").all()).toEqual(
        mediaBefore,
      );
      expect(
        db.prepare("SELECT name FROM sqlite_master WHERE name='youtube_videos'").all(),
      ).toEqual([]);
      expect(readFileSync(file)).toEqual(bytes);
      const backup = readdirSync(home.backupsDir).find((name) => !backupsBefore.has(name))!;
      expect(backup).toContain(`pre-migration-${version}-to-12-`);
      expect(readFileSync(join(home.backupsDir, backup))).toEqual(oldBytes);
      if (version >= 9)
        expect(new SqliteBibleRepository(db).chapter("rvr1960", "JHN", 3).verses[0].text).toBe(
          "Versículo guardado",
        );
      const backupCount = readdirSync(home.backupsDir).length;
      migrate(db, home.backupsDir);
      expect(readdirSync(home.backupsDir)).toHaveLength(backupCount);
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  },
);

it("retires links from schema 11 while preserving songs, sections, plan order and local media", () => {
  const db = new SqliteDatabase(":memory:");
  try {
    migrate(
      db,
      undefined,
      MIGRATIONS.filter((migration) => migration.version <= 11),
    );
    db.exec(`
      INSERT INTO songs(id,title,author,youtube_id,search_text,created_at,updated_at)
      VALUES('linked-song','Keep my lyrics','Author','M7lc1UVf-VE','keep my lyrics','2026-01-01','2026-01-01');
      INSERT INTO song_sections VALUES('slide','linked-song',0,'Coro','Keep this text');
      INSERT INTO youtube_videos VALUES('linked-video','M7lc1UVf-VE','Retired video','Author','2026-01-01','2026-01-01');
      INSERT INTO service_plan_items VALUES('video-plan','youtube','linked-video',0,'2026-01-01','2026-01-01');
      INSERT INTO service_plan_items VALUES('song-plan','song','linked-song',1,'2026-01-01','2026-01-01');
    `);
    migrate(db);
    expect(
      db.prepare("SELECT title,youtube_id FROM songs WHERE id='linked-song'").get(),
    ).toMatchObject({ title: "Keep my lyrics", youtube_id: null });
    expect(db.prepare("SELECT text FROM song_sections WHERE id='slide'").get()?.text).toBe(
      "Keep this text",
    );
    expect(db.prepare("SELECT id,position FROM service_plan_items").all()).toEqual([
      { id: "song-plan", position: 0 },
    ]);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(12);
  } finally {
    db.close();
  }
});
