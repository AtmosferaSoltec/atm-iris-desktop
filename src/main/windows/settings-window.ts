import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { env } from "../env";

let settingsWindow: BrowserWindow | null = null;

/**
 * "Configuración" in its own window, never in place of the console: operators closed Iris to
 * leave the settings page and lost the console. Only one; asking again brings it to the front.
 */
export function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.focus();
    return;
  }
  const window = new BrowserWindow({
    title: "Configuración · Iris",
    icon: join(__dirname, "../../resources/icon.png"),
    width: 860,
    height: 880,
    minWidth: 680,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  settingsWindow = window;
  window.on("page-title-updated", (event) => event.preventDefault());
  window.once("ready-to-show", () => window.show());
  // What changed here (church name, Bibles, imported songs…) reaches the console when the
  // operator goes back to it or closes this window.
  const tellOthers = (): void => {
    for (const other of BrowserWindow.getAllWindows())
      if (other !== window && !other.isDestroyed()) other.webContents.send("settings:changed");
  };
  window.on("blur", tellOthers);
  window.on("closed", () => {
    settingsWindow = null;
    tellOthers();
  });
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  if (!app.isPackaged && env.rendererUrl) void window.loadURL(`${env.rendererUrl}#/settings`);
  else void window.loadFile(join(__dirname, "../renderer/index.html"), { hash: "/settings" });
}
