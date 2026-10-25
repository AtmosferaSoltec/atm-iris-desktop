import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIrisHome, type IrisHome } from "../files/iris-home";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { SqliteMediaRepository } from "../repositories/sqlite/media-repository";
import { collisionName, mediaFolder, validateMediaFile } from "../files/media-paths";
import { MediaService } from "./media-service";

let root: string;
let home: IrisHome;
let db: SqliteDatabase;
let repository: SqliteMediaRepository;
let service: MediaService;
let trashed: string[];
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "iris-media-test-"));
  home = createIrisHome(join(root, "Iris"));
  db = createTestDatabase();
  repository = new SqliteMediaRepository(db);
  trashed = [];
  service = new MediaService(repository, home, async (path) => {
    trashed.push(path);
    await unlink(path);
  });
});
afterEach(async () => {
  db.close();
  await rm(root, { recursive: true, force: true });
});
describe("media imports and scanning", () => {
  it("selects folders by role, rejects unsupported types and sizes and names collisions safely", () => {
    expect(mediaFolder("track", "audio")).toBe("Audio");
    expect(mediaFolder("sound", "audio")).toBe("Sounds");
    expect(mediaFolder("background", "video")).toBe("Backgrounds");
    expect(mediaFolder("library", "video")).toBe("Videos");
    expect(mediaFolder("library", "image")).toBe("Images");
    expect(() => mediaFolder("background", "audio")).toThrow();
    expect(() => validateMediaFile("file.exe", 100)).toThrow();
    expect(() => validateMediaFile("video.mp4", 4 * 1024 ** 3)).toThrow();
    expect(() => validateMediaFile("empty.png", 0)).toThrow();
    expect(collisionName("/external/song.mp3", 2)).toBe("song (2).mp3");
    expect(collisionName("CON.mp3", 1)).toBe("_CON.mp3");
  });
  it("copies without changing the source, handles collisions and trashes explicit deletions", async () => {
    const source = join(root, "fixture.png");
    await writeFile(source, "image-bytes");
    const first = await service.importFile(source, "library");
    const second = await service.importFile(source, "library");
    expect(first.fileName).toBe("fixture.png");
    expect(second.fileName).toBe("fixture (2).png");
    expect(await readFile(source, "utf8")).toBe("image-bytes");
    expect((await readdir(home.imagesDir)).sort()).toEqual(["fixture (2).png", "fixture.png"]);
    service.update({ id: first.id, title: "Renamed", description: null });
    expect(await readdir(home.imagesDir)).toContain("fixture.png");
    await service.delete(first.id);
    expect(trashed).toEqual([join(home.imagesDir, "fixture.png")]);
    expect(repository.get(first.id)).toBeNull();
  });
  it("registers files dropped by hand, marks vanish/return and is idempotent", async () => {
    const path = join(home.audioDir, "Piano.mp3");
    await writeFile(path, "track");
    await writeFile(join(home.audioDir, ".hidden.mp3"), "ignored");
    await writeFile(join(home.audioDir, "partial.mp3.part"), "ignored");
    expect(await service.scan()).toEqual({ changed: 1 });
    expect(await service.scan()).toEqual({ changed: 0 });
    const [entry] = repository.all();
    expect(entry.asset.role).toBe("track");
    await unlink(path);
    await service.scan();
    expect(service.get(entry.asset.id).isMissing).toBe(true);
    await writeFile(path, "track");
    await service.scan();
    expect(service.get(entry.asset.id).isMissing).toBe(false);
    expect(repository.all()).toHaveLength(1);
  });
  it("removes only an invalid newly imported background copy and preserves a scanned user file", async () => {
    const source = join(root, "background.mp4");
    await writeFile(source, "video");
    const imported = await service.importFile(source, "background");
    await expect(
      service.setMeasures({ id: imported.id, durationSeconds: 40, width: 1920, height: 1080 }),
    ).rejects.toThrow("30 segundos");
    expect(repository.get(imported.id)).toBeNull();
    expect(await readFile(source, "utf8")).toBe("video");
    expect(await readdir(home.backgroundsDir)).toEqual([]);
    await writeFile(join(home.backgroundsDir, "user.mp4"), "video");
    await service.scan();
    const [entry] = repository.all();
    await expect(
      service.setMeasures({ id: entry.asset.id, durationSeconds: 40, width: 1920, height: 1080 }),
    ).rejects.toThrow();
    expect(await readFile(join(home.backgroundsDir, "user.mp4"), "utf8")).toBe("video");
  });
});
