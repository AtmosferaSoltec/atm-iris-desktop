import type { ConsoleItem, LibraryEntry } from "@shared/domain/console";
import type { LocalMediaAsset } from "@shared/domain/models";
import { mediaEntry, songEntry, youtubeEntry } from "@shared/domain/library-entries";
import { errorMessage } from "@shared/errors";
import { invoke } from "@renderer/lib/ipc";
import { assetUrl } from "@renderer/features/media/upload/use-media-upload";

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
    return { entry: mediaEntry(asset, asset.isMissing ? null : assetUrl(id)), content };
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
    const asset = await invoke("media:get", id);
    return { asset, url: asset.isMissing ? null : assetUrl(id) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function saveYouTubeVideo(
  link: string,
): Promise<{ entry?: LibraryEntry; error?: string }> {
  try {
    return { entry: youtubeEntry(await invoke("youtube-videos:create", link)) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
