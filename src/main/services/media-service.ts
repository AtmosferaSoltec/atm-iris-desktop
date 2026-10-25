import { createReadStream, existsSync } from "node:fs";
import { open, readdir, stat, statfs, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { basename, extname } from "node:path";
import type { z } from "@shared/zod";
import type { LocalMediaAsset, MediaRole, Paginated, StorageUsage } from "@shared/domain/models";
import { backgroundProblem } from "@shared/domain/media-rules";
import { AppError } from "@shared/errors";
import { soundEntry } from "@shared/domain/sounds";
import { createId } from "@shared/id";
import { nameKey } from "@shared/lib/text";
import type {
  mediaDetailsSchema,
  mediaListSchema,
  mediaMeasuresSchema,
  mediaRoleChangeSchema,
} from "@shared/schemas/media";
import type { IrisHome } from "../files/iris-home";
import { collisionName, fileType, mediaFolder, validateMediaFile } from "../files/media-paths";
import type { MediaEntry, MediaRepository } from "../repositories/types";

export type ImportProgress = { fileName: string; completedBytes: number; totalBytes: number };
export class MediaService {
  private scanPromise: Promise<{ changed: number }> | undefined;
  private readonly activeImports = new Set<string>();
  constructor(
    private readonly repository: MediaRepository,
    readonly home: IrisHome,
    private readonly trash: (path: string) => Promise<void>,
    private readonly changed: () => void = () => {},
    private readonly progress: (value: ImportProgress) => void = () => {},
  ) {}
  getEntry(id: string): MediaEntry {
    const entry = this.repository.get(id);
    if (!entry) throw new AppError("NOT_FOUND", "No encontramos el archivo.");
    return entry;
  }
  get(id: string): LocalMediaAsset {
    return this.getEntry(id).asset;
  }
  list(input: z.infer<typeof mediaListSchema>): Paginated<LocalMediaAsset> {
    const key = nameKey(input.search);
    const items = this.repository
      .all()
      .map((entry) => entry.asset)
      .filter(
        (asset) =>
          (input.kind === "all" || asset.kind === input.kind) &&
          (!input.role || asset.role === input.role) &&
          (!key || nameKey(`${asset.title} ${asset.description ?? ""}`).includes(key)),
      );
    return {
      data: items.slice((input.page - 1) * input.limit, input.page * input.limit),
      meta: {
        page: input.page,
        limit: input.limit,
        total: items.length,
        totalPages: Math.ceil(items.length / input.limit),
      },
    };
  }
  private entry(
    path: string,
    role: MediaRole,
    sizeBytes: number,
    isImportPending = false,
  ): MediaEntry {
    const type = validateMediaFile(path, sizeBytes);
    mediaFolder(role, type.kind);
    const now = new Date().toISOString();
    return {
      relativePath: path,
      isImportPending,
      asset: {
        id: createId(),
        ...type,
        role,
        title: basename(path, extname(path)).slice(0, 120),
        description: null,
        fileName: basename(path),
        sizeBytes,
        durationSeconds: null,
        width: null,
        height: null,
        soundIcon: role === "sound" ? "music" : null,
        isBackground: role === "background",
        isMissing: false,
        needsMeasures: true,
        createdAt: now,
        updatedAt: now,
      },
    };
  }
  async importFile(source: string, role: MediaRole): Promise<LocalMediaAsset> {
    let destination: string | undefined;
    let hasCopied = false;
    try {
      const info = await stat(source);
      if (!info.isFile()) throw new AppError("FILE_TYPE_UNSUPPORTED", "Elige un archivo.");
      const type = validateMediaFile(source, info.size);
      const folder = mediaFolder(role, type.kind);
      if (role === "background") {
        const problem = backgroundProblem({
          ...type,
          sizeBytes: info.size,
          width: null,
          height: null,
          durationSeconds: 0,
        });
        if (problem) throw new AppError("VALIDATION_FAILED", problem);
      }
      const disk = await statfs(this.home.root);
      if (disk.bavail * disk.bsize < info.size)
        throw new AppError("DISK_FULL", "No queda espacio en el disco.");
      for (let index = 1; ; index++) {
        const relativePath = `${folder}/${collisionName(source, index)}`;
        destination = this.home.resolveInside(relativePath);
        this.activeImports.add(relativePath);
        try {
          // Exclusive creation is what prevents two imports from overwriting each other.
          const output = await open(destination, "wx");
          hasCopied = true;
          let completedBytes = 0;
          let lastReported = 0;
          const progress = this.progress;
          await pipeline(
            createReadStream(source),
            new Transform({
              transform(chunk: Buffer, _encoding, callback) {
                completedBytes += chunk.byteLength;
                if (completedBytes - lastReported >= 1024 * 1024) {
                  progress({ fileName: basename(source), completedBytes, totalBytes: info.size });
                  lastReported = completedBytes;
                }
                callback(null, chunk);
              },
            }),
            output.createWriteStream(),
          );
          const entry = this.entry(relativePath, role, info.size, role === "background");
          this.repository.insert(entry);
          this.progress({
            fileName: basename(source),
            completedBytes: info.size,
            totalBytes: info.size,
          });
          this.changed();
          return entry.asset;
        } catch (error) {
          if (!hasCopied && (error as NodeJS.ErrnoException).code === "EEXIST") continue;
          throw error;
        } finally {
          this.activeImports.delete(relativePath);
        }
      }
    } catch (error) {
      if (hasCopied && destination) await unlink(destination).catch(() => {});
      if (error instanceof AppError) throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOSPC")
        throw new AppError("DISK_FULL", "No queda espacio en el disco.");
      throw new AppError(
        "INTERNAL",
        "No pudimos importar el archivo. Revisa los permisos e inténtalo de nuevo.",
      );
    }
  }
  async setMeasures(input: z.infer<typeof mediaMeasuresSchema>): Promise<LocalMediaAsset> {
    const entry = this.getEntry(input.id);
    const next = {
      ...entry.asset,
      durationSeconds: entry.asset.kind === "image" ? null : input.durationSeconds,
      width: entry.asset.kind === "audio" ? null : input.width,
      height: entry.asset.kind === "audio" ? null : input.height,
    };
    if (next.isBackground) {
      const problem = backgroundProblem(next);
      if (problem) {
        if (entry.isImportPending) {
          await unlink(this.home.resolveInside(entry.relativePath));
          this.repository.delete(input.id);
          this.changed();
        }
        throw new AppError("VALIDATION_FAILED", problem);
      }
    }
    this.repository.update({ ...entry, asset: next, isImportPending: false });
    this.changed();
    return this.get(input.id);
  }
  update(input: z.infer<typeof mediaDetailsSchema>): LocalMediaAsset {
    const entry = this.getEntry(input.id);
    this.repository.update({
      ...entry,
      asset: { ...entry.asset, title: input.title, description: input.description || null },
    });
    this.changed();
    return this.get(input.id);
  }
  changeRole(input: z.infer<typeof mediaRoleChangeSchema>): LocalMediaAsset {
    const entry = this.getEntry(input.id);
    mediaFolder(input.role, entry.asset.kind);
    if (input.role === "background") {
      const problem = backgroundProblem(entry.asset);
      if (problem) throw new AppError("VALIDATION_FAILED", problem);
    }
    const asset = {
      ...entry.asset,
      role: input.role,
      isBackground: input.role === "background",
      soundIcon: input.role === "sound" ? (input.soundIcon ?? "music") : null,
    };
    this.repository.update({ ...entry, asset });
    this.changed();
    return this.get(input.id);
  }
  async delete(id: string): Promise<void> {
    const entry = this.getEntry(id);
    const path = this.home.resolveInside(entry.relativePath);
    if (existsSync(path)) await this.trash(path);
    this.repository.delete(id);
    this.changed();
  }
  scan(): Promise<{ changed: number }> {
    this.scanPromise ??= this.scanFiles().finally(() => {
      this.scanPromise = undefined;
    });
    return this.scanPromise;
  }
  private async scanFiles(): Promise<{ changed: number }> {
    const seen = new Set<string>();
    let count = 0;
    const existing = new Map(this.repository.all().map((entry) => [entry.relativePath, entry]));
    const walk = async (directory: string, role: MediaRole): Promise<void> => {
      for (const child of await readdir(this.home.resolveInside(directory), {
        withFileTypes: true,
      })) {
        if (child.name.startsWith(".") || child.isSymbolicLink()) continue;
        const path = `${directory}/${child.name}`;
        if (child.isDirectory()) {
          await walk(path, role);
          continue;
        }
        if (!child.isFile() || !fileType(child.name)) continue;
        seen.add(path);
        if (this.activeImports.has(path)) continue;
        try {
          const info = await stat(this.home.resolveInside(path));
          const old = existing.get(path);
          if (!old) {
            this.repository.insert(this.entry(path, role, info.size));
            count++;
          } else if (old.asset.isMissing || old.asset.sizeBytes !== info.size) {
            this.repository.update({
              ...old,
              asset: {
                ...old.asset,
                isMissing: false,
                sizeBytes: info.size,
                durationSeconds:
                  old.asset.sizeBytes === info.size ? old.asset.durationSeconds : null,
                width: old.asset.sizeBytes === info.size ? old.asset.width : null,
                height: old.asset.sizeBytes === info.size ? old.asset.height : null,
              },
            });
            count++;
          }
        } catch (error) {
          if (!(error instanceof AppError)) throw error;
        }
      }
    };
    for (const [folder, role] of [
      ["Audio", "track"],
      ["Videos", "library"],
      ["Images", "library"],
      ["Backgrounds", "background"],
      ["Sounds", "sound"],
    ] as const)
      await walk(folder, role);
    for (const [path, entry] of existing)
      if (!seen.has(path) && !entry.asset.isMissing) {
        this.repository.update({ ...entry, asset: { ...entry.asset, isMissing: true } });
        count++;
      }
    if (count) this.changed();
    return { changed: count };
  }
  sounds(): import("@shared/domain/console").SoundEntry[] {
    return this.repository
      .all()
      .map((entry) => entry.asset)
      .filter((asset) => asset.role === "sound" && !asset.isMissing)
      .map(soundEntry);
  }
  async storageUsage(): Promise<StorageUsage> {
    const disk = await statfs(this.home.root);
    const breakdown: StorageUsage["breakdown"] = { library: 0, background: 0, track: 0, sound: 0 };
    for (const { asset } of this.repository.all())
      if (!asset.isMissing) breakdown[asset.role] += asset.sizeBytes;
    return {
      usedBytes: Object.values(breakdown).reduce((sum, size) => sum + size, 0),
      freeBytes: disk.bavail * disk.bsize,
      breakdown,
    };
  }
}
