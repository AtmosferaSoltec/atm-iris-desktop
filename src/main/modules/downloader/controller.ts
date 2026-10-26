import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, stat, rm, rename } from "node:fs/promises";
import { join } from "node:path";
import { z } from "@shared/zod";
import { AppError, errorMessage } from "@shared/errors";
import type { DownloadJob, DownloaderStatus } from "@shared/schemas/downloader";
import type { DownloaderContext } from "../../app/downloader-context";
import { collisionName } from "../../files/media-paths";
import type { DownloaderTools } from "./tool-manager";
import { runTool, type ProcessRunner } from "./process-runner";
import {
  commonArguments,
  downloadArguments,
  validatedDownload,
  videoMetadataSchema,
  parseDownloadProgress,
  downloadFailure,
  MAX_DOWNLOAD_BYTES,
  MAX_DOWNLOAD_SECONDS,
} from "./policy";

export interface ManagedTools extends DownloaderTools {
  update(signal: AbortSignal): Promise<void>;
  configure(folder: string, signal: AbortSignal): Promise<void>;
  isUpdateDue(): Promise<boolean>;
}
const probeSchema = z.object({
  format: z.object({ duration: z.coerce.number().finite().positive().max(MAX_DOWNLOAD_SECONDS) }),
  streams: z.array(
    z.object({
      codec_type: z.string(),
      codec_name: z.string().optional(),
      width: z.number().int().positive().max(100000).optional(),
      height: z.number().int().positive().max(100000).optional(),
    }),
  ),
});

export class DownloadController {
  private job: DownloadJob | null = null;
  private operation: Promise<unknown> | null = null;
  private abort: AbortController | null = null;
  private isInstalling = false;
  private updateError: string | null = null;
  private isCancelled = false;
  constructor(
    private readonly context: DownloaderContext,
    private readonly tools: ManagedTools,
    private readonly run: ProcessRunner = runTool,
    private readonly runtime = process.execPath,
  ) {}
  private enabled(): boolean {
    return this.context.settings.getPreference<boolean>("features.downloader", false) === true;
  }
  private guard(): void {
    if (!this.enabled())
      throw new AppError(
        "NOT_FOUND",
        "Activa las descargas personales antes de usar esta herramienta.",
      );
  }
  private idle(): void {
    if (this.operation) throw new AppError("CONFLICT", "Espera a que termine la operación actual.");
  }
  async status(): Promise<DownloaderStatus> {
    return {
      isAvailable: true,
      isEnabled: this.enabled(),
      isInstalling: this.isInstalling,
      ...(await this.tools.status()),
      updateError: this.updateError,
      job: this.job ? { ...this.job } : null,
    };
  }
  async enable(isEnabled: boolean): Promise<DownloaderStatus> {
    this.idle();
    this.context.settings.setPreference("features.downloader", isEnabled);
    return this.status();
  }
  async prepare(folder?: string): Promise<DownloaderStatus> {
    this.guard();
    this.idle();
    this.isInstalling = true;
    this.updateError = null;
    this.abort = new AbortController();
    const signal = AbortSignal.any([this.abort.signal, AbortSignal.timeout(180_000)]);
    this.operation = folder ? this.tools.configure(folder, signal) : this.tools.update(signal);
    try {
      await this.operation;
    } catch (error) {
      this.updateError =
        error instanceof AppError
          ? error.message
          : "No pudimos preparar la herramienta. Revisa la conexión y vuelve a intentarlo.";
      throw new AppError("INTERNAL", this.updateError);
    } finally {
      this.operation = null;
      this.isInstalling = false;
      this.abort = null;
    }
    return this.status();
  }
  async weeklyCheck(): Promise<void> {
    if (
      !this.enabled() ||
      this.operation ||
      this.context.isE2e ||
      !(await this.tools.isUpdateDue())
    )
      return;
    await this.prepare();
  }
  async start(raw: unknown): Promise<DownloadJob> {
    this.guard();
    this.idle();
    const input = validatedDownload(raw);
    await this.tools.verify();
    // Recheck after asynchronous setup so simultaneous IPC requests cannot start two jobs.
    this.guard();
    this.idle();
    this.isCancelled = false;
    this.abort = new AbortController();
    const signal = AbortSignal.any([this.abort.signal, AbortSignal.timeout(30 * 60_000)]);
    this.job = {
      id: randomUUID(),
      phase: "checking",
      title: "Video de YouTube",
      progress: 0,
      message: null,
      assetId: null,
    };
    this.operation = this.execute(input, signal).finally(() => {
      this.operation = null;
      this.abort = null;
    });
    return { ...this.job };
  }
  cancel(): void {
    if (this.job?.phase === "importing") return;
    this.isCancelled = true;
    this.abort?.abort();
  }
  isBusy(): boolean {
    return this.operation !== null;
  }
  async dispose(): Promise<void> {
    this.cancel();
    await this.operation?.catch(() => {});
  }
  private set(patch: Partial<DownloadJob>): void {
    if (this.job) this.job = { ...this.job, ...patch };
  }
  private async execute(
    input: ReturnType<typeof validatedDownload>,
    signal: AbortSignal,
  ): Promise<void> {
    const jobAbort = this.abort;
    let stage: string | undefined;
    let monitor: ReturnType<typeof setInterval> | undefined;
    let isOversized = false;
    try {
      await mkdir(this.tools.directory, { recursive: true });
      stage = await mkdtemp(join(this.tools.directory, ".download-"));
      const cwd = stage;
      const common = commonArguments(this.runtime, this.tools.directory);
      const info = await this.run(
        this.tools.executable,
        [...common, "--dump-single-json", "--skip-download", "--", input.url],
        { cwd, signal },
      );
      const parsed = videoMetadataSchema.safeParse(JSON.parse(info.stdout));
      if (
        !parsed.success ||
        parsed.data.id !== input.videoId ||
        parsed.data.is_live ||
        ["is_live", "is_upcoming", "post_live"].includes(parsed.data.live_status ?? "")
      )
        throw new AppError(
          "VALIDATION_FAILED",
          "Elige un video público de hasta 30 minutos; no se admiten emisiones en vivo.",
        );
      const metadata = parsed.data;
      this.set({ title: metadata.title, phase: "downloading" });
      monitor = setInterval(() => {
        void readdir(cwd)
          .then(async (names) => {
            const sizes = await Promise.all(
              names.map(async (name) => (await stat(join(cwd, name))).size),
            );
            if (
              sizes.reduce((total, size) => total + size, 0) >
              MAX_DOWNLOAD_BYTES * 2 + 32 * 1024 * 1024
            ) {
              isOversized = true;
              jobAbort?.abort();
            }
          })
          .catch(() => {});
      }, 1000);
      await this.run(
        this.tools.executable,
        [...common, ...downloadArguments(input, join(cwd, "download.%(ext)s"))],
        {
          cwd,
          signal,
          onLine: (line) => {
            const progress = parseDownloadProgress(line);
            if (progress !== null) this.set({ progress: Math.min(94, progress) });
            if (/\[Merger\]|\[ExtractAudio\]|IRIS_FINISHED|IRIS_CONVERT/.test(line))
              this.set({ phase: "converting", progress: 95 });
          },
        },
      );
      signal.throwIfAborted();
      const output = join(cwd, `download.${input.format}`);
      const file = await stat(output);
      if (!file.isFile() || file.size <= 0 || file.size > MAX_DOWNLOAD_BYTES)
        throw new AppError(
          "FILE_TOO_LARGE",
          "El archivo supera el límite de 200 MB o no se pudo generar.",
        );
      const measured = await this.run(
        this.tools.ffprobe,
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration:stream=codec_type,codec_name,width,height",
          "-of",
          "json",
          output,
        ],
        { cwd, signal },
      );
      const probe = probeSchema.parse(JSON.parse(measured.stdout));
      const video = probe.streams.find((stream) => stream.codec_type === "video");
      if (
        input.format === "mp4"
          ? video?.codec_name !== "h264"
          : !probe.streams.some(
              (stream) => stream.codec_type === "audio" && stream.codec_name === "mp3",
            )
      )
        throw new AppError(
          "FILE_TYPE_UNSUPPORTED",
          "La herramienta no generó un MP4/MP3 compatible. Prueba otro video o calidad.",
        );
      const name = collisionName(
        `${metadata.title.slice(0, 100)} [${metadata.id}].${input.format}`,
        1,
      );
      const source = join(cwd, name);
      await rename(output, source);
      signal.throwIfAborted();
      this.set({ phase: "importing", progress: 98 });
      const asset = await this.context.media.importFile(
        source,
        input.format === "mp4" ? "library" : input.audioRole,
      );
      await this.context.media.setMeasures({
        id: asset.id,
        durationSeconds: probe.format.duration,
        width: input.format === "mp4" ? (video?.width ?? null) : null,
        height: input.format === "mp4" ? (video?.height ?? null) : null,
      });
      this.context.media.update({
        id: asset.id,
        title: metadata.title.replace(/[\r\n]/g, " ").slice(0, 120),
        description: null,
      });
      this.set({
        phase: "completed",
        progress: 100,
        assetId: asset.id,
        message:
          input.format === "mp4"
            ? "Video guardado en Iris/Videos."
            : input.audioRole === "sound"
              ? "MP3 guardado en Iris/Sounds."
              : "MP3 guardado en Iris/Audio. Puedes elegirlo como pista al editar una canción.",
      });
    } catch (error) {
      const message = isOversized
        ? "La descarga supera el límite de 200 MB."
        : error instanceof AppError
          ? errorMessage(error)
          : downloadFailure(String(error)).message;
      this.set({
        phase: this.isCancelled ? "cancelled" : "failed",
        message: this.isCancelled ? "Descarga cancelada." : message,
      });
    } finally {
      if (monitor) clearInterval(monitor);
      if (stage) await rm(stage, { recursive: true, force: true }).catch(() => {});
    }
  }
}
