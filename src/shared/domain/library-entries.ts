import type { MediaAsset, SongSummary, YoutubeVideo } from "./models";
import { youTubeThumbnail } from "../lib/youtube";
import type { LibraryEntry } from "./console";

// How the library shows each song and file (BIBLIOTECA). Pure: the server builds the first
// list with it and the console keeps it current after a song is saved or a file uploaded.

type SongFacts = Pick<
  SongSummary,
  "id" | "title" | "author" | "sectionCount" | "audio" | "youtubeId"
>;

/** Just the author: a track is shown with its icon (YouTube or music), not words. */
export function songSubtitle(song: Pick<SongFacts, "author">): string {
  return song.author;
}

export function songEntry(song: SongFacts): LibraryEntry {
  return {
    kind: "song",
    id: song.id,
    title: song.title,
    subtitle: songSubtitle(song),
    icon: !(song.audio || song.youtubeId)
      ? "song"
      : song.sectionCount === 0
        ? "track"
        : "songTrack",
    durationSeconds: song.audio?.durationSeconds ?? null,
    previewUrl: null,
    author: song.author,
    hasYouTube: Boolean(song.youtubeId),
    hasAudio: Boolean(song.audio),
  };
}

/** `previewUrl` is the file's signed URL: an image is its own thumbnail, a video shows its first frame. */
export function mediaEntry(asset: MediaAsset, previewUrl: string | null = null): LibraryEntry {
  return {
    kind: "media",
    id: asset.id,
    title: asset.title,
    subtitle: asset.kind === "video" ? "Video" : "Imagen",
    icon: asset.kind === "video" ? "video" : "image",
    durationSeconds: asset.durationSeconds,
    previewUrl,
  };
}

export function youtubeEntry(video: YoutubeVideo): LibraryEntry {
  return {
    kind: "youtube",
    id: video.id,
    title: video.title,
    subtitle: video.author ? `YouTube · ${video.author}` : "YouTube",
    icon: "youtube",
    durationSeconds: null,
    previewUrl: youTubeThumbnail(video.videoId),
  };
}

const KIND_ORDER = { song: 0, media: 1, youtube: 2 } as const;

/** Songs first, then files, then YouTube, each by title: the order the panel lists them in. */
export function sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.title.localeCompare(b.title, "es", { sensitivity: "base" }),
  );
}
