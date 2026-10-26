import { localAssetUrl } from "@shared/lib/asset-url";
import { measureMediaUrl } from "@renderer/features/media/upload/measure";
import type { ConsoleItem, LibraryEntry } from "@shared/domain/console";
import type { LocalMediaAsset } from "@shared/domain/models";
import { mediaEntry, songEntry } from "@shared/domain/library-entries";
import { errorMessage } from "@shared/errors";
import { invoke } from "@renderer/lib/ipc";

export type ItemContent = Omit<ConsoleItem, "planItemId">;
export async function libraryItem(
  kind: "song" | "media",
  id: string,
): Promise<{ entry?: LibraryEntry; content?: ItemContent; gone?: boolean; error?: string }> {
  try {
    const content = await invoke("console:item", { kind, refId: id });
    if (kind === "song") {
      const song = await invoke("songs:get", id);
      return { entry: songEntry({ ...song, sectionCount: song.sections.length }), content };
    }
    const asset = await invoke("media:get", id);
    return { entry: mediaEntry(asset, asset.isMissing ? null : localAssetUrl(asset)), content };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function archivedSongs(): Promise<{ entries?: LibraryEntry[]; error?: string }> {
  try {
    const entries: LibraryEntry[] = [];
    for (let page = 1; ; page++) {
      const result = await invoke("songs:list", {
        search: "",
        page,
        limit: 100,
        sort: "title",
        archived: true,
      });
      entries.push(...result.data.map(songEntry));
      if (page >= result.meta.totalPages) break;
    }
    return { entries };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function archiveSong(id: string): Promise<{ error?: string }> {
  try {
    await invoke("songs:archive", id);
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function unarchiveSong(id: string): Promise<{ entry?: LibraryEntry; error?: string }> {
  try {
    const song = await invoke("songs:unarchive", id);
    return { entry: songEntry({ ...song, sectionCount: song.sections.length }) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function editSongSlide(
  songId: string,
  index: number,
  previousText: string,
  text: string,
): Promise<{ content?: ItemContent; error?: string }> {
  try {
    return { content: await invoke("songs:edit-slide", { songId, index, previousText, text }) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function mediaFile(
  id: string,
): Promise<{ asset?: LocalMediaAsset; url?: string | null; error?: string }> {
  try {
    let asset = await invoke("media:get", id);
    const url = asset.isMissing ? null : localAssetUrl(asset);
    if (asset.needsMeasures && url) {
      const measures = await measureMediaUrl(url, asset.kind);
      asset = await invoke("media:set-measures", { id, ...measures });
    }
    return { asset, url };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
