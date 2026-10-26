import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { join } from "node:path";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createTestDatabase } from "../../db/test-database";
import type { SqliteDatabase } from "../../db/sqlite";
import { createIrisHome } from "../../files/iris-home";
import { SqliteSettingsRepository } from "../../repositories/sqlite/settings-repository";
import { SqliteMediaRepository } from "../../repositories/sqlite/media-repository";
import { MediaService } from "../../services/media-service";
import type { DownloaderContext } from "../../app/downloader-context";
import { createDownloaderHandlers } from "../../app/downloader-disabled";
import { DownloadController, type ManagedTools } from "./controller";
import type { ProcessRunner } from "./process-runner";

let db: SqliteDatabase;
let context: DownloaderContext;
let repository: SqliteMediaRepository;
let tools: ManagedTools;
beforeEach(() => {
  db = createTestDatabase();
  const settings = new SqliteSettingsRepository(db);
  settings.initialize("America/Lima");
  const home = createIrisHome(join(process.env.IRIS_HOME!, crypto.randomUUID()));
  repository = new SqliteMediaRepository(db);
  context = {
    settings,
    media: new MediaService(repository, home, async () => {}),
    userData: join(home.root, ".electron"),
    isE2e: true,
  };
  const directory = join(context.userData, "tools");
  tools = {
    directory,
    executable: join(directory, "yt-dlp"),
    ffprobe: join(directory, "ffprobe"),
    status: vi.fn(async () => ({ version: "2026.10.14", hasFfmpeg: true })),
    verify: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    configure: vi.fn(async () => {}),
    isUpdateDue: vi.fn(async () => true),
  };
});
afterEach(() => db.close());
const input = {
  url: "https://youtu.be/M7lc1UVf-VE",
  format: "mp4" as const,
  quality: "720" as const,
  audioRole: "track" as const,
};
it.each([
  ["mp4", "track"],
  ["mp3", "track"],
  ["mp3", "sound"],
] as const)(
  "imports a completed %s through the media service and removes staging files",
  async (format, audioRole) => {
    const run = vi.fn<ProcessRunner>(async (path, args, options) => {
      if (args.includes("--dump-single-json"))
        return {
          stdout: JSON.stringify({ id: "M7lc1UVf-VE", title: "Video de prueba", duration: 12 }),
          stderr: "",
        };
      if (path === tools.ffprobe)
        return {
          stdout: JSON.stringify({
            format: { duration: "12" },
            streams:
              format === "mp4"
                ? [{ codec_type: "video", codec_name: "h264", width: 320, height: 180 }]
                : [{ codec_type: "audio", codec_name: "mp3" }],
          }),
          stderr: "",
        };
      options.onLine?.("IRIS_PROGRESS:50:100");
      await writeFile(join(options.cwd, `download.${format}`), "synthetic media bytes");
      return { stdout: "", stderr: "" };
    });
    const controller = new DownloadController(context, tools, run);
    await controller.enable(true);
    await controller.start({ ...input, format, audioRole });
    await vi.waitFor(async () => expect((await controller.status()).job?.phase).toBe("completed"));
    await vi.waitFor(() => expect(controller.isBusy()).toBe(false));
    const entries = repository.all();
    expect(entries).toHaveLength(1);
    expect(entries[0].relativePath).toContain(
      format === "mp4" ? "Videos/" : audioRole === "sound" ? "Sounds/" : "Audio/",
    );
    expect(entries[0].asset).toMatchObject({
      title: "Video de prueba",
      durationSeconds: 12,
      role: format === "mp4" ? "library" : audioRole,
    });
    expect(await readFile(context.media.home.resolveInside(entries[0].relativePath), "utf8")).toBe(
      "synthetic media bytes",
    );
    expect(
      (await readdir(tools.directory)).filter((name) => name.startsWith(".download-")),
    ).toHaveLength(0);
  },
);
it("gates the disabled build and the persisted feature flag before invoking tools", async () => {
  const controller = new DownloadController(context, tools, vi.fn<ProcessRunner>());
  await expect(controller.start(input)).rejects.toThrow("Activa");
  expect(tools.verify).not.toHaveBeenCalled();
  const disabled = createDownloaderHandlers();
  expect(await disabled["downloader:status"](undefined)).toMatchObject({
    isAvailable: false,
    isEnabled: false,
  });
  expect(() => disabled["downloader:start"](input)).toThrow("edición personal");
  await controller.enable(true);
  await expect(new DownloadController(context, tools).status()).resolves.toMatchObject({
    isEnabled: true,
  });
  await controller.weeklyCheck();
  expect(tools.update).not.toHaveBeenCalled();
});
it("rejects live/overlong videos before downloading and clears failed staging files", async () => {
  const run = vi.fn<ProcessRunner>(async () => ({
    stdout: JSON.stringify({ id: "M7lc1UVf-VE", title: "En vivo", duration: 7200, is_live: true }),
    stderr: "",
  }));
  const controller = new DownloadController(context, tools, run);
  await controller.enable(true);
  await controller.start(input);
  await vi.waitFor(async () => expect((await controller.status()).job?.phase).toBe("failed"));
  expect(run).toHaveBeenCalledTimes(1);
  expect(repository.all()).toHaveLength(0);
  await controller.dispose();
  expect(await readdir(tools.directory)).toHaveLength(0);
});
it("cancels an active process without importing partial media or accepting a parallel job", async () => {
  const run = vi.fn<ProcessRunner>(
    async (_path, _args, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }),
      ),
  );
  const controller = new DownloadController(context, tools, run);
  await controller.enable(true);
  await controller.start(input);
  await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  await expect(controller.start(input)).rejects.toThrow("operación actual");
  controller.cancel();
  await controller.dispose();
  expect((await controller.status()).job?.phase).toBe("cancelled");
  expect(repository.all()).toHaveLength(0);
  expect(await readdir(tools.directory)).toHaveLength(0);
});

it("checks for updates only in an enabled personal installation outside E2E", async () => {
  context.isE2e = false;
  tools.isUpdateDue = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
  const controller = new DownloadController(context, tools);
  await controller.weeklyCheck();
  expect(tools.update).not.toHaveBeenCalled();
  await controller.enable(true);
  await controller.weeklyCheck();
  expect(tools.update).toHaveBeenCalledTimes(1);
  await controller.weeklyCheck();
  expect(tools.update).toHaveBeenCalledTimes(1);
});
