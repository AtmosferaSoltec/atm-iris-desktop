import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename, rm, stat, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "@shared/errors";
import { z } from "@shared/zod";
import { runTool, type ProcessRunner } from "./process-runner";

const MAX_TOOL_BYTES = 150 * 1024 * 1024;
const ALLOWED_HOSTS = new Set([
  "api.github.com",
  "github.com",
  "release-assets.githubusercontent.com",
  "objects.githubusercontent.com",
  "github-releases.githubusercontent.com",
]);
const installedSchema = z.object({
  version: z.string().regex(/^\d{4}\.\d{2}\.\d{2}(?:\.\d+)?$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  checkedAt: z.string().datetime(),
});
export type ToolStatus = { version: string | null; hasFfmpeg: boolean };
export interface DownloaderTools {
  directory: string;
  executable: string;
  ffprobe: string;
  status(): Promise<ToolStatus>;
  verify(): Promise<void>;
}

export async function releaseResource(
  url: string,
  maxBytes: number,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Buffer> {
  let target = new URL(url);
  const timeout = AbortSignal.timeout(120_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  for (let redirects = 0; redirects < 6; redirects++) {
    if (
      target.protocol !== "https:" ||
      !ALLOWED_HOSTS.has(target.hostname) ||
      target.username ||
      target.password
    )
      throw new AppError(
        "VALIDATION_FAILED",
        "La descarga de la herramienta no proviene de una ubicación permitida.",
      );
    const response = await request(target.href, {
      redirect: "manual",
      signal: combined,
      headers: { "User-Agent": "Iris-Desktop" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) break;
      target = new URL(location, target);
      continue;
    }
    if (!response.ok || !response.body)
      throw new AppError(
        "OFFLINE",
        "No pudimos obtener la herramienta oficial. Revisa la conexión e inténtalo de nuevo.",
      );
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > maxBytes)
          throw new AppError(
            "FILE_TOO_LARGE",
            "La descarga de la herramienta supera el tamaño permitido.",
          );
        chunks.push(Buffer.from(chunk.value));
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    return Buffer.concat(chunks);
  }
  throw new AppError("OFFLINE", "No pudimos seguir la descarga oficial de la herramienta.");
}

export class ToolManager implements DownloaderTools {
  readonly directory: string;
  readonly executable: string;
  readonly ffprobe: string;
  private readonly ffmpeg: string;
  private readonly manifest: string;
  constructor(
    userData: string,
    private readonly platform: NodeJS.Platform = process.platform,
    private readonly request: typeof fetch = fetch,
    private readonly run: ProcessRunner = runTool,
  ) {
    this.directory = join(userData, "tools");
    const suffix = platform === "win32" ? ".exe" : "";
    this.executable = join(this.directory, `yt-dlp${suffix}`);
    this.ffmpeg = join(this.directory, `ffmpeg${suffix}`);
    this.ffprobe = join(this.directory, `ffprobe${suffix}`);
    this.manifest = join(this.directory, "yt-dlp-installed.json");
  }
  private async installed(): Promise<z.infer<typeof installedSchema> | null> {
    try {
      return installedSchema.parse(JSON.parse(await readFile(this.manifest, "utf8")));
    } catch {
      return null;
    }
  }
  async status(): Promise<ToolStatus> {
    const installed = await this.installed();
    const files = await Promise.all(
      [this.executable, this.ffmpeg, this.ffprobe].map(async (path) => {
        try {
          return (await stat(path)).isFile();
        } catch {
          return false;
        }
      }),
    );
    return {
      version: installed && files[0] ? installed.version : null,
      hasFfmpeg: files[1] && files[2],
    };
  }
  async verify(): Promise<void> {
    const installed = await this.installed();
    const status = await this.status();
    if (!installed || !status.version || !status.hasFfmpeg)
      throw new AppError(
        "NOT_FOUND",
        "Prepara la herramienta y selecciona FFmpeg antes de descargar.",
      );
    const executableSize = (await stat(this.executable)).size;
    if (executableSize <= 0 || executableSize > MAX_TOOL_BYTES)
      throw new AppError(
        "VALIDATION_FAILED",
        "La herramienta cambió desde su instalación. Pulsa Actualizar herramienta.",
      );
    if (
      createHash("sha256")
        .update(await readFile(this.executable))
        .digest("hex") !== installed.sha256
    )
      throw new AppError(
        "VALIDATION_FAILED",
        "La herramienta cambió desde su instalación. Pulsa Actualizar herramienta.",
      );
  }
  async update(signal: AbortSignal): Promise<void> {
    const asset =
      this.platform === "win32" ? "yt-dlp.exe" : this.platform === "darwin" ? "yt-dlp_macos" : null;
    if (!asset)
      throw new AppError(
        "VALIDATION_FAILED",
        "Las descargas personales están disponibles en Windows y macOS.",
      );
    const metadata = z
      .object({ tag_name: installedSchema.shape.version })
      .parse(
        JSON.parse(
          (
            await releaseResource(
              "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest",
              1024 * 1024,
              this.request,
              signal,
            )
          ).toString("utf8"),
        ),
      );
    const base = `https://github.com/yt-dlp/yt-dlp/releases/download/${metadata.tag_name}`;
    const sums = (
      await releaseResource(`${base}/SHA2-256SUMS`, 256 * 1024, this.request, signal)
    ).toString("utf8");
    const hash = sums
      .split(/\r?\n/)
      .map((line) => /^([a-fA-F0-9]{64})\s+\*?(\S+)$/.exec(line))
      .find((entry) => entry?.[2] === asset)?.[1]
      .toLowerCase();
    if (!hash)
      throw new AppError(
        "VALIDATION_FAILED",
        "No encontramos la verificación oficial de la herramienta.",
      );
    const installed = await this.installed();
    if (installed?.version === metadata.tag_name && installed.sha256 === hash) {
      const info = await stat(this.executable).catch(() => null);
      if (
        info &&
        info.size > 0 &&
        info.size <= MAX_TOOL_BYTES &&
        createHash("sha256")
          .update(await readFile(this.executable))
          .digest("hex") === hash
      ) {
        await writeFile(
          this.manifest,
          JSON.stringify({ ...installed, checkedAt: new Date().toISOString() }),
        );
        return;
      }
    }
    const binary = await releaseResource(`${base}/${asset}`, MAX_TOOL_BYTES, this.request, signal);
    if (createHash("sha256").update(binary).digest("hex") !== hash)
      throw new AppError(
        "VALIDATION_FAILED",
        "La verificación de la herramienta falló. Se conserva la versión anterior.",
      );
    await mkdir(this.directory, { recursive: true });
    const temporary = join(this.directory, `.yt-dlp-${randomUUID()}`);
    try {
      await writeFile(temporary, binary, { mode: 0o700, flag: "wx" });
      signal.throwIfAborted();
      await rename(temporary, this.executable);
      await writeFile(
        this.manifest,
        JSON.stringify({
          version: metadata.tag_name,
          sha256: hash,
          checkedAt: new Date().toISOString(),
        }),
      );
    } finally {
      await rm(temporary, { force: true });
    }
  }
  async isUpdateDue(now = Date.now()): Promise<boolean> {
    const installed = await this.installed();
    return Boolean(installed && now - Date.parse(installed.checkedAt) >= 7 * 86400_000);
  }
  async configure(folder: string, signal: AbortSignal): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const stage = join(this.directory, `.ffmpeg-${randomUUID()}`);
    await mkdir(stage);
    const suffix = this.platform === "win32" ? ".exe" : "";
    try {
      for (const name of ["ffmpeg", "ffprobe"]) {
        const source = join(folder, `${name}${suffix}`);
        const info = await stat(source);
        if (!info.isFile() || info.size <= 0 || info.size > MAX_TOOL_BYTES)
          throw new Error("Invalid executable");
        const destination = join(stage, `${name}${suffix}`);
        await copyFile(source, destination);
        const { chmod } = await import("node:fs/promises");
        await chmod(destination, 0o700);
        const result = await this.run(destination, ["-version"], { cwd: stage, signal });
        if (!result.stdout.startsWith(`${name} version`)) throw new Error("Unexpected tool");
      }
      for (const name of ["ffmpeg", "ffprobe"])
        await rename(join(stage, `${name}${suffix}`), join(this.directory, `${name}${suffix}`));
    } catch {
      throw new AppError(
        "VALIDATION_FAILED",
        "Selecciona la carpeta que contiene ffmpeg y ffprobe para este sistema operativo.",
      );
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  }
}
