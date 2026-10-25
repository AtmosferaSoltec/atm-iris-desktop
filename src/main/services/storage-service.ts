import { readdir, stat, statfs } from "node:fs/promises";
import type { LocalMediaAsset } from "@shared/domain/models";
import type { IrisHome } from "../files/iris-home";
import type { MediaRepository } from "../repositories/types";
import type { SqliteMaintenanceRepository } from "../repositories/sqlite/maintenance-repository";

export type LocalStorage = {
  folders: { name: string; bytes: number }[];
  freeBytes: number;
  unused: LocalMediaAsset[];
  missing: LocalMediaAsset[];
};
export class StorageService {
  constructor(
    private readonly repository: SqliteMaintenanceRepository,
    private readonly media: MediaRepository,
    private readonly home: IrisHome,
  ) {}
  async get(): Promise<LocalStorage> {
    const size = async (directory: string): Promise<number> => {
      let bytes = 0;
      for (const child of await readdir(this.home.resolveInside(directory), {
        withFileTypes: true,
      })) {
        if (child.isSymbolicLink()) continue;
        const relative = `${directory}/${child.name}`;
        if (child.isDirectory()) bytes += await size(relative);
        else if (child.isFile()) bytes += (await stat(this.home.resolveInside(relative))).size;
      }
      return bytes;
    };
    const folders = await Promise.all(
      ["Audio", "Videos", "Images", "Backgrounds", "Sounds", "Database"].map(async (name) => ({
        name,
        bytes: await size(name),
      })),
    );
    const disk = await statfs(this.home.root);
    const unused = new Set(this.repository.unusedIds());
    const assets = this.media.all().map((entry) => entry.asset);
    return {
      folders,
      freeBytes: disk.bavail * disk.bsize,
      unused: assets.filter((asset) => unused.has(asset.id) && !asset.isMissing),
      missing: assets.filter((asset) => asset.isMissing),
    };
  }
}
