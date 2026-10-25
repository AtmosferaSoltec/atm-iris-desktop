import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIrisHome, type IrisHome } from "./iris-home";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { SqliteMediaRepository } from "../repositories/sqlite/media-repository";
import { MediaService } from "../services/media-service";
import { mediaResponse, parseRange } from "./protocol";

let root: string;
let home: IrisHome;
let db: SqliteDatabase;
let repository: SqliteMediaRepository;
let id: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "iris-protocol-"));
  home = createIrisHome(join(root, "Iris"));
  db = createTestDatabase();
  repository = new SqliteMediaRepository(db);
  await writeFile(join(home.videosDir, "fixture.mp4"), "0123456789");
  await new MediaService(repository, home, async () => {}).scan();
  id = repository.all()[0].asset.id;
});
afterEach(async () => {
  db.close();
  await rm(root, { recursive: true, force: true });
});
describe("iris-media protocol", () => {
  it("serves only registered assets and honors byte, suffix, head and invalid ranges", async () => {
    const request = (range?: string, method = "GET"): Request =>
      new Request(`iris-media://asset/${id}`, { method, headers: range ? { range } : {} });
    const response = await mediaResponse(request("bytes=2-5"), repository, home);
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(await response.text()).toBe("2345");
    expect(await (await mediaResponse(request("bytes=-3"), repository, home)).text()).toBe("789");
    expect(await (await mediaResponse(request(), repository, home)).text()).toBe("0123456789");
    expect((await mediaResponse(request("bytes=20-30"), repository, home)).status).toBe(416);
    const head = await mediaResponse(request(undefined, "HEAD"), repository, home);
    expect(head.headers.get("content-length")).toBe("10");
    expect(await head.text()).toBe("");
    expect(
      (await mediaResponse(new Request("iris-media://asset/../../etc/passwd"), repository, home))
        .status,
    ).toBe(404);
    expect(parseRange("bytes=1-3,6-7", 10)).toBe("invalid");
  });
  it("rejects traversal and symlink escapes in stored paths", async () => {
    const entry = repository.get(id)!;
    repository.update({ ...entry, relativePath: "../outside.mp4" });
    expect(
      (await mediaResponse(new Request(`iris-media://asset/${id}`), repository, home)).status,
    ).toBe(404);
    const outside = join(root, "outside.mp4");
    await writeFile(outside, "secret");
    await symlink(outside, join(home.videosDir, "escape.mp4"));
    repository.update({ ...entry, relativePath: "Videos/escape.mp4" });
    expect(
      (await mediaResponse(new Request(`iris-media://asset/${id}`), repository, home)).status,
    ).toBe(404);
  });
});
