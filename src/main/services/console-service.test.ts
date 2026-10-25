import { afterEach, beforeEach, expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { SqliteSongsRepository } from "../repositories/sqlite/songs-repository";
import { SqliteMediaRepository } from "../repositories/sqlite/media-repository";
import { SqlitePlanRepository } from "../repositories/sqlite/plan-repository";
import { SqliteSettingsRepository } from "../repositories/sqlite/settings-repository";
import { SongsService } from "./songs-service";
import type { MediaService } from "./media-service";
import { ConsoleService } from "./console-service";

let db: SqliteDatabase;
let plan: SqlitePlanRepository;
let songs: SongsService;
let service: ConsoleService;
beforeEach(() => {
  db = createTestDatabase();
  const media = new SqliteMediaRepository(db);
  const repository = new SqliteSongsRepository(db, media);
  plan = new SqlitePlanRepository(db);
  const settings = new SqliteSettingsRepository(db);
  settings.initialize("America/Lima");
  songs = new SongsService(repository, media, {} as MediaService);
  service = new ConsoleService(plan, repository, media, settings, songs);
});
afterEach(() => db.close());
it("allows duplicate references, reindexes moves/removals and cascades song deletion", async () => {
  const { song } = await songs.save(null, {
    title: "Sublime gracia",
    author: "",
    sections: [{ label: null, text: "Gracia" }],
    audioId: null,
    youtubeId: null,
  });
  const first = service.add("song", song.id);
  const second = service.add("song", song.id);
  expect(first.planItemId).not.toBe(second.planItemId);
  service.move(second.planItemId, 0);
  expect(plan.list().map((row) => row.id)).toEqual([second.planItemId, first.planItemId]);
  service.remove(second.planItemId);
  expect(plan.list()[0].position).toBe(0);
  expect(service.load().items[0].slides[0].text).toBe("Gracia");
  await songs.delete(song.id);
  expect(plan.list()).toEqual([]);
});
it("rejects missing targets and atomically clears the plan", async () => {
  expect(() => service.add("song", "missing")).toThrow();
  const { song } = await songs.save(null, {
    title: "Canción",
    author: "",
    sections: [{ label: null, text: "Texto" }],
    audioId: null,
    youtubeId: null,
  });
  service.add("song", song.id);
  service.clear();
  expect(plan.list()).toEqual([]);
});
