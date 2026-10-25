import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { createIrisHome } from "../files/iris-home";
import { SqliteMediaRepository } from "../repositories/sqlite/media-repository";
import { SqliteSongsRepository } from "../repositories/sqlite/songs-repository";
import { MediaService } from "./media-service";
import { SongsService } from "./songs-service";
import { songInputSchema, songListSchema } from "@shared/schemas/songs";

let root: string;
let db: SqliteDatabase;
let repository: SqliteSongsRepository;
let media: MediaService;
let service: SongsService;
const input = {
  title: "Sublime gracia",
  author: "John Newton",
  sections: [{ label: "Estrofa 1", text: "Qué preciosa gracia" }],
  audioId: null,
  youtubeId: null,
};
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "iris-songs-"));
  db = createTestDatabase();
  const mediaRepository = new SqliteMediaRepository(db);
  repository = new SqliteSongsRepository(db, mediaRepository);
  media = new MediaService(mediaRepository, createIrisHome(join(root, "Iris")), async () => {});
  service = new SongsService(repository, mediaRepository, media, async (videoId) => ({
    video: { videoId, title: "Pista", author: "" },
  }));
});
afterEach(async () => {
  db.close();
  await rm(root, { recursive: true, force: true });
});
describe("songs", () => {
  it("enforces lyrics or track, audio xor YouTube and section limits", () => {
    expect(songInputSchema.safeParse({ ...input, sections: [] }).success).toBe(false);
    expect(
      songInputSchema.safeParse({ ...input, sections: [], youtubeId: "dQw4w9WgXcQ" }).success,
    ).toBe(true);
    expect(
      songInputSchema.safeParse({
        ...input,
        audioId: "01900000-0000-7000-8000-000000000001",
        youtubeId: "dQw4w9WgXcQ",
      }).success,
    ).toBe(false);
    for (const patch of [
      { title: "" },
      { title: "a".repeat(121) },
      { author: "a".repeat(121) },
      { sections: [{ label: null, text: "a".repeat(2001) }] },
      { sections: Array.from({ length: 81 }, () => ({ label: null, text: "text" })) },
      { youtubeId: "bad" },
    ])
      expect(songInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("ranks normalized title, author and lyrics, allows duplicate titles and recomputes search on update", async () => {
    const lyrics = await service.save(null, {
      ...input,
      title: "Otra",
      author: "Autor",
      sections: [{ label: null, text: "ORACIÓN" }],
    });
    const author = await service.save(null, { ...input, title: "Otra dos", author: "Oración" });
    const title = await service.save(null, { ...input, title: "Oración" });
    await service.save(null, { ...input, title: "Oración" });
    const results = repository.list(songListSchema.parse({ search: "oracion" }));
    expect(results.meta.total).toBe(4);
    expect(results.data[0].title).toBe("Oración");
    expect(results.data[2].id).toBe(author.song.id);
    expect(results.data[3].id).toBe(lyrics.song.id);
    await service.save(title.song.id, { ...input, title: "Changed" });
    expect(repository.list(songListSchema.parse({ search: "oracion" })).meta.total).toBe(3);
    expect(repository.list(songListSchema.parse({ search: "%" })).meta.total).toBe(0);
  });
  it("keeps files on archive, unarchive and default deletion and enforces track ownership", async () => {
    const path = join(root, "track.mp3");
    await writeFile(path, "track");
    const asset = await media.importFile(path, "track");
    const saved = await service.save(null, { ...input, audioId: asset.id });
    await expect(service.save(null, { ...input, audioId: asset.id })).rejects.toThrow("Revisa");
    service.archive(saved.song.id, true);
    expect(service.get(saved.song.id).audio?.id).toBe(asset.id);
    expect(repository.list(songListSchema.parse({})).meta.total).toBe(0);
    expect(repository.list(songListSchema.parse({ archived: true })).meta.total).toBe(1);
    service.archive(saved.song.id, false);
    await service.delete(saved.song.id);
    expect(media.get(asset.id).id).toBe(asset.id);
    expect(await readFile(join(media.home.audioDir, "track.mp3"), "utf8")).toBe("track");
  });
  it("saves offline YouTube tracks with a warning", async () => {
    const offline = new SongsService(
      repository,
      new SqliteMediaRepository(db),
      media,
      async () => ({ error: "Sin conexión", isOffline: true }),
    );
    const saved = await offline.save(null, { ...input, sections: [], youtubeId: "dQw4w9WgXcQ" });
    expect(saved.warning).toBe("Sin conexión");
    expect(saved.song.youtubeId).toBe("dQw4w9WgXcQ");
  });
});
