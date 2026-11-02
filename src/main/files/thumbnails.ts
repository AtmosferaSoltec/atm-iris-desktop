import type { IrisHome } from "./iris-home";
import type { MediaRepository } from "../repositories/types";

/** Wide enough for a 4-column grid on an iPad or a swatch on the console, small enough to send. */
export const THUMBNAIL_WIDTH = 320;
const CACHE_LIMIT = 300;

/** Turns a file into a small JPEG, or null when it cannot be read. */
export type ThumbnailRenderer = (
  file: { path: string; url: string },
  kind: "image" | "video",
) => Promise<Buffer | null>;

/**
 * One still JPEG per image or video, made once from the file and kept in memory (never saved): the
 * console and the iPad show it instead of playing twenty videos at once.
 */
export class Thumbnails {
  private readonly cache = new Map<string, Promise<Buffer | null>>();

  constructor(
    private readonly repository: MediaRepository,
    private readonly home: IrisHome,
    private readonly render: ThumbnailRenderer,
  ) {}

  get(id: string): Promise<Buffer | null> {
    const entry = this.repository.get(id);
    if (!entry || entry.asset.isMissing || entry.asset.kind === "audio")
      return Promise.resolve(null);
    // A replaced file gets a new thumbnail.
    const key = `${id}:${entry.asset.sizeBytes}:${entry.asset.updatedAt}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const kind = entry.asset.kind;
    const made = (async () => {
      try {
        return await this.render(
          { path: this.home.resolveInside(entry.relativePath), url: `iris-media://asset/${id}` },
          kind,
        );
      } catch {
        return null;
      }
    })();
    if (this.cache.size >= CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, made);
    return made;
  }
}
