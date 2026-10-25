import type { SongsService } from "../services/songs-service";
import type { SongsRepository } from "../repositories/types";
import { searchLyrics } from "../services/lyrics-lookup";
import { lookUpYouTube } from "../services/youtube-oembed";
import type { IpcHandlers } from "./dispatch";

export function songsHandlers(
  service: SongsService,
  repository: SongsRepository,
): Pick<
  IpcHandlers,
  | "songs:list"
  | "songs:get"
  | "songs:create"
  | "songs:update"
  | "songs:delete"
  | "songs:archive"
  | "songs:unarchive"
  | "songs:lookup-lyrics"
  | "youtube:check"
> {
  return {
    "songs:list": (input) => repository.list(input),
    "songs:get": (id) => service.get(id),
    "songs:create": (input) => service.save(null, input),
    "songs:update": ({ id, input }) => service.save(id, input),
    "songs:delete": ({ id, deleteAudio }) => service.delete(id, deleteAudio),
    "songs:archive": (id) => service.archive(id, true),
    "songs:unarchive": (id) => service.archive(id, false),
    "songs:lookup-lyrics": ({ title, artist }) => searchLyrics(title, artist),
    "youtube:check": (id) => lookUpYouTube(id),
  };
}
