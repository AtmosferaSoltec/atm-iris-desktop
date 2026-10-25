import type { SettingsRepository } from "../repositories/types";
import { visibleWindowBounds } from "./window-bounds";
import { app, BrowserWindow, screen } from "electron";
import { join } from "node:path";
import { env } from "../env";

export function createConsoleWindow(settings?: SettingsRepository): BrowserWindow {
  const saved = visibleWindowBounds(
    settings?.getPreference("consoleWindow", null),
    screen.getAllDisplays().map((display) => display.workArea),
  );
  const window = new BrowserWindow({
    title: "Iris",
    icon: join(__dirname, "../../resources/icon.png"),
    width: 1440,
    height: 900,
    ...(saved ? { x: saved.x, y: saved.y, width: saved.width, height: saved.height } : {}),
    minWidth: 1100,
    minHeight: 720,
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
  window.once("ready-to-show", () => {
    if (saved?.isMaximized) window.maximize();
    window.show();
  });
  window.on("close", () =>
    settings?.setPreference("consoleWindow", {
      ...window.getNormalBounds(),
      isMaximized: window.isMaximized(),
    }),
  );
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  if (!app.isPackaged && env.rendererUrl) {
    void window.loadURL(env.rendererUrl);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
  return window;
}
