import { app, dialog, shell } from "electron";
import { readFile, stat, writeFile } from "node:fs/promises";
import { AppError } from "@shared/errors";
import type { IpcHandlers } from "./dispatch";
import type { BackupService } from "../services/backup-service";
import type { SnapshotService } from "../services/snapshot-service";
import type { StorageService } from "../services/storage-service";
import type { SongImportService } from "../services/song-import-service";
import { basename } from "node:path";

export function backupHandlers(
  backup: BackupService,
  snapshots: SnapshotService,
  storage: StorageService,
  homePath: string,
  songImport: SongImportService,
): Pick<
  IpcHandlers,
  | "backup:export"
  | "backup:import"
  | "songs:import-preview"
  | "songs:import-confirm"
  | "backup:erase"
  | "backup:snapshot"
  | "storage:details"
  | "app:open-folder"
> {
  return {
    "backup:export": async () => {
      const result = await dialog.showSaveDialog({
        title: "Descargar respaldo",
        defaultPath: "iris-respaldo.json",
        filters: [{ name: "Respaldo de Iris", extensions: ["json"] }],
      });
      if (result.canceled || !result.filePath) return { isCanceled: true };
      await writeFile(result.filePath, JSON.stringify(backup.export(), null, 2), "utf8");
      return { isCanceled: false };
    },
    "backup:import": async () => {
      const result = await dialog.showOpenDialog({
        title: "Importar respaldo",
        properties: ["openFile"],
        filters: [{ name: "Respaldo de Iris", extensions: ["json"] }],
      });
      if (result.canceled || !result.filePaths[0]) return null;
      const path = result.filePaths[0];
      let file: unknown;
      try {
        if ((await stat(path)).size > 50 * 1024 * 1024)
          throw new Error("Respaldo demasiado grande");
        file = JSON.parse(await readFile(path, "utf8"));
      } catch {
        throw new AppError("VALIDATION_FAILED", "Ese archivo no es un respaldo de Iris.");
      }
      return backup.import(file);
    },
    "songs:import-preview": async () => {
      const result = await dialog.showOpenDialog({
        title: "Importar canciones",
        properties: ["openFile"],
        filters: [{ name: "Canciones (JSON o TXT)", extensions: ["json", "txt"] }],
      });
      if (result.canceled || !result.filePaths[0]) return null;
      const path = result.filePaths[0];
      let content: string;
      try {
        if ((await stat(path)).size > 50 * 1024 * 1024) throw new Error("Archivo demasiado grande");
        content = await readFile(path, "utf8");
      } catch {
        throw new AppError("VALIDATION_FAILED", "No pudimos leer ese archivo.");
      }
      return songImport.preview(content, basename(path));
    },
    "songs:import-confirm": (input) => songImport.confirm(input),
    "backup:erase": (input) => backup.erase(input),
    "backup:snapshot": () => snapshots.create(true)!,
    "storage:details": () => storage.get(),
    "app:open-folder": async (folder) => {
      const problem = await shell.openPath(folder === "home" ? homePath : app.getPath("logs"));
      if (problem) throw new AppError("INTERNAL", "No pudimos abrir la carpeta.");
    },
  };
}
