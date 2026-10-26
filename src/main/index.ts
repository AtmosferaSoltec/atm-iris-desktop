import { installMenu } from "./windows/menu";
import { app, BrowserWindow, dialog, session, protocol } from "electron";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { env } from "./env";
import { boot } from "./app/boot";
import { errorMessage } from "@shared/errors";
import { initializeLogging, logError } from "./app/logging";
import { createConsoleWindow } from "./windows/console-window";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "iris-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);
app.setName("Iris");
// Test profiles keep logs and Chromium storage away from the operator's data.
if (env.isE2e && env.irisHome) {
  const profile = join(env.irisHome, ".electron");
  mkdirSync(profile, { recursive: true });
  app.setPath("userData", profile);
}

function fail(error: unknown): void {
  logError(error);
  dialog.showErrorBox("Iris", errorMessage(error));
  app.exit(1);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  process.on("uncaughtException", fail);
  process.on("unhandledRejection", fail);
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window?.isMinimized()) window.restore();
    window?.show();
    window?.focus();
  });
  void app.whenReady().then(() => {
    // macOS ignores BrowserWindow icons and uses the Electron host icon during development.
    app.dock?.setIcon(join(__dirname, "../../resources/icon.png"));
    initializeLogging(join(app.getPath("userData"), "logs"));
    app.setAppLogsPath(join(app.getPath("userData"), "logs"));
    installMenu();
    app.setAppUserModelId("com.atmosfera.iris");
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    const { db, settings } = boot();
    app.once("will-quit", () => db.close());
    createConsoleWindow(settings);
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createConsoleWindow(settings);
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" || env.isE2e) app.quit();
  });
}
