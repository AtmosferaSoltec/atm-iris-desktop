import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile, readFile, unlink } from "node:fs/promises";
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
};
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "iris-songs-"));
  db = createTestDatabase();
  const mediaRepository = new SqliteMediaRepository(db);
  repository = new SqliteSongsRepository(db, mediaRepository);
  media = new MediaService(mediaRepository, createIrisHome(join(root, "Iris")), async (path) => {
    await unlink(path);
  });
  service = new SongsService(repository, mediaRepository, media);
});
afterEach(async () => {
  db.close();
  await rm(root, { recursive: true, force: true });
});
describe("songs", () => {
  it("requires lyrics or a local track and enforces section limits", () => {
    expect(songInputSchema.safeParse({ ...input, sections: [] }).success).toBe(false);
    expect(
      songInputSchema.safeParse({ ...input, sections: [], youtubeId: "dQw4w9WgXcQ" }).success,
    ).toBe(false);
    expect(
      songInputSchema.safeParse({
        ...input,
        sections: [],
        audioId: "01900000-0000-7000-8000-000000000001",
      }).success,
    ).toBe(true);
    for (const patch of [
      { title: "" },
      { title: "a".repeat(121) },
      { author: "a".repeat(121) },
      { sections: [{ label: null, text: "a".repeat(2001) }] },
      { sections: Array.from({ length: 81 }, () => ({ label: null, text: "text" })) },
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
  it("keeps files on archive and unarchive, cleans unused deleted tracks and enforces track ownership", async () => {
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
    expect(() => media.get(asset.id)).toThrow("No encontramos");
    await expect(readFile(join(media.home.audioDir, "track.mp3"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
  it("removes replaced and detached tracks after saving, preserves other referenced audio", async () => {
    const source = join(root, "old.mp3");
    await writeFile(source, "old");
    const old = await media.importFile(source, "track");
    const saved = await service.save(null, { ...input, audioId: old.id });
    const replacement = await media.importFile(source, "track");
    await service.save(saved.song.id, { ...input, audioId: replacement.id });
    expect(() => media.get(old.id)).toThrow("No encontramos");
    expect(media.get(replacement.id).id).toBe(replacement.id);
    await service.save(saved.song.id, { ...input, audioId: null });
    expect(() => media.get(replacement.id)).toThrow("No encontramos");
    const kept = await media.importFile(source, "track");
    const keptSong = await service.save(null, { ...input, audioId: kept.id });
    await media.deleteUnusedTrack(kept.id);
    expect(service.get(keptSong.song.id).audio?.id).toBe(kept.id);
  });
});

it("keeps a song available if its audio cannot be trashed", async () => {
  const { vi } = await import("vitest");
  const source = join(root, "locked.mp3");
  await writeFile(source, "audio");
  const audio = await media.importFile(source, "track");
  const saved = await service.save(null, { ...input, audioId: audio.id });
  const cleanup = vi.spyOn(media, "deleteUnusedTrack").mockRejectedValueOnce(new Error("locked"));
  await expect(service.delete(saved.song.id)).rejects.toThrow("locked");
  expect(service.get(saved.song.id).audio?.id).toBe(audio.id);
  expect(await readFile(join(media.home.audioDir, "locked.mp3"), "utf8")).toBe("audio");
  cleanup.mockRestore();
});

it("reports a cleanup failure without losing a successfully edited song", async () => {
  const { vi } = await import("vitest");
  const source = join(root, "old.mp3");
  await writeFile(source, "audio");
  const audio = await media.importFile(source, "track");
  const saved = await service.save(null, { ...input, audioId: audio.id });
  const cleanup = vi.spyOn(media, "deleteUnusedTrack").mockRejectedValueOnce(new Error("locked"));
  const updated = await service.save(saved.song.id, {
    ...input,
    title: "Saved edit",
    audioId: null,
  });
  expect(updated.warning).toContain("La canción se guardó");
  expect(service.get(saved.song.id)).toMatchObject({ title: "Saved edit", audio: null });
  expect(media.get(audio.id).id).toBe(audio.id);
  cleanup.mockRestore();
});

it("requires MP3 for new tracks and preserves an existing legacy local track", async () => {
  const source = join(root, "legacy.wav");
  await writeFile(source, "legacy audio");
  const audio = await media.importFile(source, "track");
  await expect(service.save(null, { ...input, audioId: audio.id })).rejects.toMatchObject({
    fields: { audioId: "Elige un archivo MP3." },
  });
  const legacy = repository.save(crypto.randomUUID(), { ...input, audioId: audio.id });
  const saved = await service.save(legacy.id, {
    ...input,
    title: "Edited legacy",
    audioId: audio.id,
  });
  expect(saved.song.audio?.id).toBe(audio.id);
});
