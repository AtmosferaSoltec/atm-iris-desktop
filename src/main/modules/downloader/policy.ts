import { z } from "@shared/zod";
import { AppError, parseInput } from "@shared/errors";
import { youTubeVideoId } from "@shared/lib/youtube";
import { downloaderInputSchema, type DownloaderInput } from "@shared/schemas/downloader";

export const MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024;
export const MAX_DOWNLOAD_SECONDS = 30 * 60;
export const videoMetadataSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
  title: z.string().trim().min(1).max(500),
  duration: z.number().finite().positive().max(MAX_DOWNLOAD_SECONDS),
  is_live: z.boolean().optional(),
  live_status: z.string().optional(),
});
export function validatedDownload(
  raw: unknown,
): DownloaderInput & { videoId: string; url: string } {
  const input = parseInput(downloaderInputSchema, raw);
  const videoId = youTubeVideoId(input.url)!;
  return { ...input, videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}
export function commonArguments(runtime: string, ffmpegFolder: string): string[] {
  return [
    "--ignore-config",
    "--no-plugin-dirs",
    "--no-playlist",
    "--no-cache-dir",
    "--no-remote-components",
    "--no-js-runtimes",
    "--js-runtimes",
    `node:${runtime}`,
    "--ffmpeg-location",
    ffmpegFolder,
    "--socket-timeout",
    "20",
    "--retries",
    "2",
    "--fragment-retries",
    "2",
  ];
}
export function downloadArguments(input: DownloaderInput, output: string): string[] {
  const { url } = validatedDownload(input);
  const format =
    input.format === "mp3"
      ? ["-f", "bestaudio/best", "-x", "--audio-format", "mp3", "--audio-quality", "192K"]
      : [
          "-f",
          `bestvideo[ext=mp4][vcodec^=avc1][height<=${input.quality}]+bestaudio[ext=m4a]/best[ext=mp4][vcodec^=avc1][height<=${input.quality}]`,
          "--merge-output-format",
          "mp4",
        ];
  return [
    ...format,
    "--no-simulate",
    "--max-filesize",
    String(MAX_DOWNLOAD_BYTES),
    "--no-continue",
    "--no-overwrites",
    "--newline",
    "--progress",
    "--progress-template",
    "download:IRIS_PROGRESS:%(progress.downloaded_bytes)s:%(progress.total_bytes,progress.total_bytes_estimate)s",
    "--progress-template",
    "postprocess:IRIS_CONVERT",
    "--print",
    "after_move:IRIS_FINISHED",
    "-o",
    output,
    "--",
    url,
  ];
}
export function parseDownloadProgress(line: string): number | null {
  const match = /(?:^|\s)IRIS_PROGRESS:(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)/.exec(line);
  if (!match || Number(match[2]) <= 0) return null;
  return Math.min(99, Math.max(0, Math.floor((Number(match[1]) / Number(match[2])) * 100)));
}
export function downloadFailure(details: string): AppError {
  const message = /sign in|age.?restrict|confirm your age/i.test(details)
    ? "Este video requiere iniciar sesión o confirmar la edad. Elige un video público sin restricciones."
    : /format is not available/i.test(details)
      ? "No hay un MP4 compatible en esa calidad. Prueba otra calidad u otro video."
      : /copyright|not available|unavailable|private|removed|blocked/i.test(details)
        ? "Este video no está disponible para descargar. Prueba con otro enlace."
        : /network|timed? out|connection|resolve|unreachable/i.test(details)
          ? "No pudimos conectar con YouTube. Revisa tu conexión e inténtalo de nuevo."
          : "No pudimos descargar este video. Actualiza la herramienta y vuelve a intentarlo; si continúa, prueba otro enlace.";
  return new AppError("VALIDATION_FAILED", message);
}
