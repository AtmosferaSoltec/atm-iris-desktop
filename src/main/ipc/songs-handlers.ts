import type { SongsService } from "../services/songs-service";
import type { SongsRepository } from "../repositories/types";
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
> {
  return {
    "songs:list": (input) => repository.list(input),
    "songs:get": (id) => service.get(id),
    "songs:create": (input) => service.save(null, input),
    "songs:update": ({ id, input }) => service.save(id, input),
    "songs:delete": ({ id }) => service.delete(id),
    "songs:archive": (id) => service.archive(id, true),
    "songs:unarchive": (id) => service.archive(id, false),
  };
}
