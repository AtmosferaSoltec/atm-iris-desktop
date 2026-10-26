import { expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ToolManager, releaseResource } from "./tool-manager";
import type { ProcessRunner } from "./process-runner";

it("installs a pinned official release only after validating its checksum and preserves a previous binary on failure", async () => {
  const binary = Buffer.from("synthetic yt-dlp executable");
  const hash = createHash("sha256").update(binary).digest("hex");
  let isCorrupt = false;
  let version = "2026.10.14";
  const request = vi.fn<typeof fetch>(async (url) => {
    const target = String(url);
    if (target.includes("api.github.com"))
      return new Response(JSON.stringify({ tag_name: version }));
    if (target.endsWith("SHA2-256SUMS")) return new Response(`${hash}  yt-dlp.exe\n`);
    return new Response(isCorrupt ? "wrong executable" : binary);
  });
  const tools = new ToolManager(join(process.env.IRIS_HOME!, "manager"), "win32", request);
  await tools.update(new AbortController().signal);
  expect(await readFile(tools.executable)).toEqual(binary);
  expect(await tools.status()).toEqual({ version: "2026.10.14", hasFfmpeg: false });
  expect(
    request.mock.calls
      .map(([url]) => String(url))
      .every(
        (url) =>
          url.startsWith("https://api.github.com/") ||
          url.startsWith("https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.14/"),
      ),
  ).toBe(true);
  await tools.update(new AbortController().signal);
  expect(request.mock.calls.filter(([url]) => String(url).endsWith("yt-dlp.exe"))).toHaveLength(1);
  expect(await tools.isUpdateDue()).toBe(false);
  version = "2026.10.15";
  isCorrupt = true;
  await expect(tools.update(new AbortController().signal)).rejects.toThrow("verificación");
  expect(await readFile(tools.executable)).toEqual(binary);
  for (const name of ["ffmpeg.exe", "ffprobe.exe"])
    await writeFile(join(tools.directory, name), "synthetic conversion tool");
  await expect(tools.verify()).resolves.toBeUndefined();
  await writeFile(tools.executable, "tampered");
  await expect(tools.verify()).rejects.toThrow("cambió");
});
it("blocks insecure redirects, credentials, unknown hosts and oversized downloads", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "https://untrusted.invalid/tool" } }),
    );
  await expect(releaseResource("https://github.com/yt-dlp/tool", 10, request)).rejects.toThrow(
    "permitida",
  );
  expect(request).toHaveBeenCalledTimes(1);
  for (const url of [
    "http://github.com/tool",
    "https://user:secret@github.com/tool",
    "https://github.com.evil/tool",
  ])
    await expect(releaseResource(url, 10, request)).rejects.toThrow("permitida");
  await expect(
    releaseResource(
      "https://github.com/tool",
      2,
      vi.fn<typeof fetch>().mockResolvedValue(new Response("large")),
    ),
  ).rejects.toThrow("tamaño");
});
it("validates both user-selected conversion executables before installing them", async () => {
  const home = join(process.env.IRIS_HOME!, "conversion");
  const source = join(home, "source");
  await mkdir(source, { recursive: true });
  for (const name of ["ffmpeg.exe", "ffprobe.exe"])
    await writeFile(join(source, name), "synthetic binary");
  const run = vi.fn<ProcessRunner>(async (path) => ({
    stdout: path.endsWith("ffprobe.exe") ? "ffprobe version test" : "ffmpeg version test",
    stderr: "",
  }));
  const tools = new ToolManager(home, "win32", fetch, run);
  await tools.configure(source, new AbortController().signal);
  expect((await tools.status()).hasFfmpeg).toBe(true);
  expect(run).toHaveBeenCalledTimes(2);
  await expect(
    tools.configure(join(home, "missing"), new AbortController().signal),
  ).rejects.toThrow("ffmpeg y ffprobe");
});
