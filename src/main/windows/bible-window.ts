import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { env } from "../env";

let bibleWindow: BrowserWindow | null = null;

/**
 * "Biblia" in its own window, apart from the console: pick a book, chapter and verse and it goes
 * straight to the screens. Closing the window is how the operator stops presenting the Bible.
 * Only one; asking again brings it to the front.
 */
export function openBibleWindow(): void {
  if (bibleWindow && !bibleWindow.isDestroyed()) {
    if (bibleWindow.isMinimized()) bibleWindow.restore();
    bibleWindow.focus();
    return;
  }
  const window = new BrowserWindow({
    title: "Biblia · Iris",
    icon: join(__dirname, "../../resources/icon.png"),
    width: 980,
    height: 760,
    minWidth: 640,
    minHeight: 480,
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
  bibleWindow = window;
  window.on("page-title-updated", (event) => event.preventDefault());
  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    bibleWindow = null;
    for (const other of BrowserWindow.getAllWindows())
      if (!other.isDestroyed()) other.webContents.send("bible:closed");
  });
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  if (!app.isPackaged && env.rendererUrl) void window.loadURL(`${env.rendererUrl}#/bible`);
  else void window.loadFile(join(__dirname, "../renderer/index.html"), { hash: "/bible" });
}
