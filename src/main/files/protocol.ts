import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { IrisHome } from "./iris-home";
import type { MediaRepository } from "../repositories/types";

export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null | "invalid" {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return "invalid";
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    return "invalid";
  return { start, end };
}

export async function mediaResponse(
  request: Request,
  repository: MediaRepository,
  home: IrisHome,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const match = /^\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (url.protocol !== "iris-media:" || url.hostname !== "asset" || url.search || !match)
      return new Response(null, { status: 404 });
    const entry = repository.get(match[1]);
    if (!entry || entry.asset.isMissing) return new Response(null, { status: 404 });
    const path = home.resolveInside(entry.relativePath);
    const file = await stat(path);
    if (!file.isFile()) return new Response(null, { status: 404 });
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response(null, { status: 405 });
    const range = parseRange(request.headers.get("range"), file.size);
    const headers: Record<string, string> = {
      "Content-Type": entry.asset.contentType,
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    };
    if (range === "invalid")
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${file.size}` },
      });
    const start = range?.start ?? 0;
    const end = range?.end ?? file.size - 1;
    headers["Content-Length"] = String(range ? end - start + 1 : file.size);
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${file.size}`;
    const body =
      request.method === "HEAD" || file.size === 0
        ? null
        : Readable.toWeb(createReadStream(path, { start, end }));
    return new Response(body as ReadableStream<Uint8Array> | null, {
      status: range ? 206 : 200,
      headers,
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
