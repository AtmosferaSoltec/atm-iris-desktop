import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIrisHome, type IrisHome } from "./iris-home";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { SqliteMediaRepository } from "../repositories/sqlite/media-repository";
import { MediaService } from "../services/media-service";
import { Thumbnails } from "./thumbnails";

let root: string;
let home: IrisHome;
let db: SqliteDatabase;
let repository: SqliteMediaRepository;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "iris-thumbnails-"));
  home = createIrisHome(join(root, "Iris"));
  db = createTestDatabase();
  repository = new SqliteMediaRepository(db);
  await writeFile(join(home.videosDir, "fondo.mp4"), "video");
  await writeFile(join(home.audioDir, "pista.mp3"), "audio");
  await new MediaService(repository, home, async () => {}).scan();
});
afterEach(async () => {
  db.close();
  await rm(root, { recursive: true, force: true });
});

const idOf = (kind: string): string =>
  repository.all().find((entry) => entry.asset.kind === kind)!.asset.id;

describe("thumbnails", () => {
  it("renders a video once from its file inside the Iris home and reuses it", async () => {
    const render = vi.fn(async () => Buffer.from("jpeg"));
    const thumbnails = new Thumbnails(repository, home, render);
    expect(await thumbnails.get(idOf("video"))).toEqual(Buffer.from("jpeg"));
    await thumbnails.get(idOf("video"));
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(
      { path: join(home.videosDir, "fondo.mp4"), url: `iris-media://asset/${idOf("video")}` },
      "video",
    );
  });

  it("has nothing for audio, unknown ids or a file the system cannot read", async () => {
    const thumbnails = new Thumbnails(repository, home, async () => {
      throw new Error("codec");
    });
    expect(await thumbnails.get(idOf("audio"))).toBeNull();
    expect(await thumbnails.get("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(await thumbnails.get(idOf("video"))).toBeNull();
  });
});
