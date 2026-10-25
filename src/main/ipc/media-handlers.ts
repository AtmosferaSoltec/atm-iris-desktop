import { AppError } from "@shared/errors";
import { dialog, shell } from "electron";
import type { IpcHandlers } from "./dispatch";
import type { MediaService } from "../services/media-service";

export function mediaHandlers(
  service: MediaService,
): Pick<
  IpcHandlers,
  | "media:list"
  | "media:get"
  | "media:import"
  | "media:set-measures"
  | "media:update"
  | "media:change-role"
  | "media:scan"
  | "media:delete"
  | "media:reveal"
  | "media:open-home"
  | "media:open-folder"
  | "storage:usage"
> {
  return {
    "media:list": (input) => service.list(input),
    "media:get": (id) => service.get(id),
    "media:import": async (input) => {
      const paths =
        input.paths ??
        (
          await dialog.showOpenDialog({
            title: "Importar archivos",
            properties: ["openFile", "multiSelections"],
            filters: [
              {
                name: "Archivos multimedia",
                extensions: [
                  "jpg",
                  "jpeg",
                  "png",
                  "webp",
                  "mp4",
                  "mov",
                  "mp3",
                  "m4a",
                  "aac",
                  "wav",
                ],
              },
            ],
          })
        ).filePaths;
      const imported = [];
      for (const path of paths) imported.push(await service.importFile(path, input.role));
      return imported;
    },
    "media:set-measures": (input) => service.setMeasures(input),
    "media:update": (input) => service.update(input),
    "media:change-role": (input) => service.changeRole(input),
    "media:scan": () => service.scan(),
    "media:delete": (id) => service.delete(id),
    "media:reveal": (id) => {
      shell.showItemInFolder(service.home.resolveInside(service.getEntry(id).relativePath));
    },
    "media:open-folder": async (kind) => {
      const problem = await shell.openPath(service.folder(kind));
      if (problem)
        throw new AppError("INTERNAL", "No pudimos abrir la carpeta. Revisa que siga disponible.");
    },
    "media:open-home": async () => {
      await shell.openPath(service.home.root);
    },
    "storage:usage": () => service.storageUsage(),
  };
}
