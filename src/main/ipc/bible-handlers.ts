import { dialog } from "electron";
import type { IpcHandlers } from "./dispatch";
import type { BibleService } from "../services/bible-service";

export function bibleHandlers(
  service: BibleService,
): Pick<IpcHandlers, "bible:status" | "bible:import" | "bible:chapter"> {
  return {
    "bible:status": () => service.status(),
    "bible:chapter": (input) => service.chapter(input),
    "bible:import": async () => {
      const chosen = await dialog.showOpenDialog({
        title: "Importar Biblia RVR1960",
        properties: ["openFile"],
        filters: [{ name: "Biblia RVR1960 en XML", extensions: ["xml"] }],
      });
      return chosen.canceled || !chosen.filePaths[0]
        ? null
        : service.importFile(chosen.filePaths[0]);
    },
  };
}
