import { app, BrowserWindow, powerSaveBlocker, screen } from "electron";
import { join } from "node:path";
import type { Monitor } from "@shared/domain/monitors";
import type { SettingsRepository } from "../repositories/types";
import { MonitorService } from "./monitors";
import { ProjectionManager } from "./projection-manager";
import { env } from "../env";

export function createProjection(settings: SettingsRepository): {
  monitors: MonitorService;
  projection: ProjectionManager;
} {
  const broadcast = (name: string, data: unknown): void => {
    for (const window of BrowserWindow.getAllWindows())
      if (!window.isDestroyed()) window.webContents.send(name, data);
  };
  const monitors = new MonitorService({
    list: () =>
      screen.getAllDisplays().map((display) => ({
        id: display.id,
        label: display.label || `Pantalla ${display.id}`,
        bounds: display.bounds,
        scaleFactor: display.scaleFactor,
        isPrimary: display.id === screen.getPrimaryDisplay().id,
        isInternal: display.internal,
      })),
    subscribe: (listener) => {
      screen.on("display-added", listener);
      screen.on("display-removed", listener);
      screen.on("display-metrics-changed", listener);
      return () => {
        screen.off("display-added", listener);
        screen.off("display-removed", listener);
        screen.off("display-metrics-changed", listener);
      };
    },
  });
  const projection = new ProjectionManager(monitors, {
    create: (monitor, isPreview, onClosed) => createWindow(monitor, isPreview, onClosed),
    preventSleep: () => powerSaveBlocker.start("prevent-display-sleep"),
    allowSleep: (id) => {
      if (powerSaveBlocker.isStarted(id)) powerSaveBlocker.stop(id);
    },
    remember: (monitor) => {
      if (monitor)
        settings.setPreference("projectionMonitor", { id: monitor.id, bounds: monitor.bounds });
    },
    statusChanged: (status) => broadcast("projection:status", status),
  });
  const unsubscribe = monitors.subscribe(() => {
    projection.reconcile();
    broadcast("monitors:changed", monitors.list());
  });
  app.once("will-quit", () => {
    unsubscribe();
    projection.stop();
  });
  return { monitors, projection };
}
function createWindow(
  monitor: Monitor | null,
  isPreview: boolean,
  onClosed: () => void,
): {
  close: () => void;
  send: (frame: import("@shared/domain/projection").ProjectionFrame) => void;
} {
  const window = new BrowserWindow({
    title: "Proyección · Iris",
    ...(monitor ? monitor.bounds : { width: 960, height: 540 }),
    show: false,
    frame: isPreview,
    resizable: isPreview,
    focusable: isPreview,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      autoplayPolicy: "no-user-gesture-required",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.once("ready-to-show", () => {
    if (!isPreview) window.setFullScreen(true);
    window.showInactive();
  });
  window.once("closed", onClosed);
  if (!app.isPackaged && env.rendererUrl) void window.loadURL(`${env.rendererUrl}#/display`);
  else void window.loadFile(join(__dirname, "../renderer/index.html"), { hash: "/display" });
  return {
    close: () => {
      if (!window.isDestroyed()) window.close();
    },
    send: (frame) => {
      if (!window.isDestroyed()) window.webContents.send("projection:frame", frame);
    },
  };
}
