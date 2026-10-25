import { afterAll, afterEach, expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { SqliteYoutubeRepository } from "../repositories/sqlite/youtube-repository";
import { SqlitePlanRepository } from "../repositories/sqlite/plan-repository";
import { YoutubeService } from "./youtube-service";
const db = createTestDatabase();
afterAll(() => db.close());
afterEach(() => {
  db.exec("DELETE FROM youtube_videos");
});
it("deduplicates saved videos and cleans their service entries on delete", async () => {
  const repository = new SqliteYoutubeRepository(db);
  const service = new YoutubeService(repository, async (videoId) => ({
    video: { videoId, title: "Video", author: "Autor" },
  }));
  const first = await service.create("https://youtu.be/M7lc1UVf-VE");
  expect((await service.create("M7lc1UVf-VE")).id).toBe(first.id);
  const plan = new SqlitePlanRepository(db);
  plan.add("youtube", first.id);
  service.delete(first.id);
  expect(plan.list()).toEqual([]);
});
it("reports offline without persisting a video", async () => {
  const service = new YoutubeService(new SqliteYoutubeRepository(db), async () => ({
    isOffline: true,
  }));
  await expect(service.create("M7lc1UVf-VE")).rejects.toThrow("Sin conexión");
  expect(service.repository.list()).toEqual([]);
});
