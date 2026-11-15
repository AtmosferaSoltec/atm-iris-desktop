import { contextBridge, ipcRenderer, webUtils } from "electron";
import { eventContract, type EventName } from "@shared/ipc/events";
import type { MediaRole } from "@shared/domain/models";
import { contract, type IrisApi, type ChannelName } from "@shared/ipc/contract";

const api = Object.fromEntries(
  (Object.keys(contract) as ChannelName[]).map((key) => [
    key,
    (input: unknown) => ipcRenderer.invoke(contract[key].name, input),
  ]),
) as Omit<IrisApi, "onEvent">;
contextBridge.exposeInMainWorld("iris", {
  ...api,
  // Only browser-selected Files may supply source paths; console calls use the native picker.
  "media:import": (input: { role: MediaRole }) =>
    ipcRenderer.invoke("media:import", { role: input.role }),
  onEvent(name: EventName, listener: (data: unknown) => void) {
    if (!(name in eventContract)) throw new Error("Ese evento no existe.");
    const handler = (_event: Electron.IpcRendererEvent, data: unknown): void => {
      const result = eventContract[name].safeParse(data);
      if (result.success) listener(result.data);
    };
    ipcRenderer.on(name, handler);
    return () => {
      ipcRenderer.removeListener(name, handler);
    };
  },
  // The renderer hands over a File the person picked or dropped; only here does it become a path.
  "media:choose-track": () =>
    Promise.resolve({
      ok: false,
      error: { code: "VALIDATION_FAILED", message: "No se permite esta solicitud." },
    }),
  chooseTrack(file: File, songId?: string) {
    return ipcRenderer.invoke("media:choose-track", {
      path: webUtils.getPathForFile(file),
      ...(songId ? { songId } : {}),
    });
  },
  importDropped(files: File[], role: MediaRole) {
    return ipcRenderer.invoke("media:import", {
      role,
      paths: files.map((file) => webUtils.getPathForFile(file)),
    });
  },
});
