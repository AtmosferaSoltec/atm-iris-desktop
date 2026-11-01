import { UpdateService } from "../updates/update-service";
import { createUpdatePort } from "../updates/electron-updater";
import { createE2eUpdatePort } from "../updates/e2e-update-port";
import { BibleService } from "../services/bible-service";
import { SqliteBibleRepository } from "../repositories/sqlite/bible-repository";
import { bibleHandlers } from "../ipc/bible-handlers";
import { BackupService } from "../services/backup-service";
import { timesExportHandlers } from "../ipc/times-export-handlers";
import { SongImportService } from "../services/song-import-service";
import { AudioMatchService } from "../services/audio-match-service";
import { SnapshotService } from "../services/snapshot-service";
import { StorageService } from "../services/storage-service";
import { SqliteMaintenanceRepository } from "../repositories/sqlite/maintenance-repository";
import { backupHandlers } from "../ipc/backup-handlers";
import { TimingService } from "../services/timing-service";
import { SqliteTimingRepository } from "../repositories/sqlite/timing-repository";
import { hostname } from "node:os";
import { app, BrowserWindow, protocol, shell } from "electron";
import { RemoteServer } from "../remote/remote-server";
import { advertiseOnNetwork } from "../remote/discovery";
import { remoteHandlers } from "../ipc/remote-handlers";
import { createProjection } from "../windows/projection";
import { ConsoleService } from "../services/console-service";
import { SqlitePlanRepository } from "../repositories/sqlite/plan-repository";
import { SongsService } from "../services/songs-service";
import { SqliteSongsRepository } from "../repositories/sqlite/songs-repository";
import { songsHandlers } from "../ipc/songs-handlers";
import { MediaService } from "../services/media-service";
import { SqliteMediaRepository } from "../repositories/sqlite/media-repository";
import { mediaHandlers } from "../ipc/media-handlers";
import { mediaResponse } from "../files/protocol";
import { logError, logMessage } from "./logging";
import { env } from "../env";
import { createIrisHome, selectIrisHome } from "../files/iris-home";
import { SqliteDatabase } from "../db/sqlite";
import { migrate } from "../db/migrate";
import { SqliteSettingsRepository } from "../repositories/sqlite/settings-repository";
import { SettingsService } from "../services/settings.service";
import { registerIpc } from "../ipc/register";
import { settingsHandlers } from "../ipc/settings-handlers";

export function boot(): { db: SqliteDatabase; settings: SqliteSettingsRepository } {
  const home = createIrisHome(
    selectIrisHome(env.irisHome, app.getPath("userData"), app.getPath("home")),
  );
  const db = new SqliteDatabase(home.databasePath);
  try {
    migrate(db, home.backupsDir);
    const repository = new SqliteSettingsRepository(db);
    repository.initialize(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const mediaRepository = new SqliteMediaRepository(db);
    const broadcast = (name: string, data: unknown): void => {
      for (const window of BrowserWindow.getAllWindows())
        if (!window.isDestroyed()) window.webContents.send(name, data);
    };
    const media = new MediaService(
      mediaRepository,
      home,
      (path) => shell.trashItem(path),
      () => broadcast("media:changed", undefined),
      (progress) => broadcast("media:import-progress", progress),
    );
    protocol.handle("iris-media", (request) => mediaResponse(request, mediaRepository, home));
    const songsRepository = new SqliteSongsRepository(db, mediaRepository);
    const songsService = new SongsService(songsRepository, mediaRepository, media);
    const timing = new TimingService(new SqliteTimingRepository(db), repository);
    const consoleService = new ConsoleService(
      new SqlitePlanRepository(db),
      songsRepository,
      mediaRepository,
      repository,
      songsService,
      timing,
    );
    const maintenance = new SqliteMaintenanceRepository(db, songsRepository);
    const backup = new BackupService(maintenance, songsRepository, mediaRepository, media);
    const songImport = new SongImportService(maintenance);
    const audioMatch = new AudioMatchService(maintenance, mediaRepository, songsRepository, () =>
      media.scan(),
    );
    const snapshots = new SnapshotService(maintenance, repository, home);
    const storage = new StorageService(maintenance, mediaRepository, home);
    try {
      snapshots.create();
    } catch (error) {
      logError(error);
    }
    const { monitors, projection } = createProjection(repository);
    const bible = new BibleService(new SqliteBibleRepository(db));
    const isTestUpdate = env.isE2e && Boolean(env.e2eUpdates);
    // macOS only updates itself when the app is signed; Windows works with or without a signature.
    const isUpdateEnabled =
      isTestUpdate ||
      (!env.isE2e &&
        app.isPackaged &&
        (process.platform === "win32" || process.platform === "darwin"));
    const updates = new UpdateService(
      isTestUpdate
        ? createE2eUpdatePort(env.e2eUpdates!)
        : isUpdateEnabled
          ? createUpdatePort()
          : { check: async () => null, download: async () => {}, install: () => {} },
      {
        version: app.getVersion(),
        isEnabled: isUpdateEnabled,
        settings: repository,
        changed: (status) => broadcast("updates:changed", status),
        prepareInstall: () => {
          snapshots.create(true);
        },
        canInstall: () => !projection.status().running,
        reportError: logError,
      },
    );
    // The iPad's remote control: off until the operator turns it on (it opens the local network).
    const remote = new RemoteServer({
      computerName: hostname(),
      advertise: advertiseOnNetwork(`Iris · ${hostname()}`),
      onCommand: (command) => broadcast("remote:command", command),
      changed: (status) => broadcast("remote:changed", status),
      log: logMessage,
    });
    if (!env.isE2e && repository.getPreference("remoteEnabled", false))
      void remote.start().catch(logError);
    app.once("will-quit", () => void remote.stop().catch(logError));
    registerIpc(
      {
        ...remoteHandlers(remote, (isEnabled) =>
          repository.setPreference("remoteEnabled", isEnabled),
        ),
        "updates:status": () => updates.status(),
        "updates:retry": () => updates.retry(),
        "updates:download": () => updates.download(),
        "updates:install": () => updates.install(),
        ...bibleHandlers(bible),
        ...backupHandlers(backup, snapshots, storage, home.root, songImport),
        "people:list": () => timing.people(),
        "people:create": ({ name }) => timing.savePerson(null, name),
        "people:update": ({ id, name }) => timing.savePerson(id, name),
        "people:delete": (id) => timing.deletePerson(id),
        "people:find-or-add": (name) => timing.findOrAddPerson(name),
        "service-types:list": () => timing.serviceTypes(),
        "service-types:create": (input) => timing.saveServiceType(null, input),
        "service-types:update": ({ id, input }) => timing.saveServiceType(id, input),
        "service-types:delete": (id) => timing.deleteServiceType(id),
        "service-types:select": (id) => timing.selectService(id),
        "records:list": (input) => timing.listRecords(input),
        ...timesExportHandlers(timing, () => repository.get().church.name),
        "records:get": (id) => timing.record(id),
        "records:save": ({ id, input }) => timing.saveRecord(id, input),
        "records:delete": (id) => timing.deleteRecord(id),
        "records:adjust-duration": ({ recordId, blockId, actualSeconds }) =>
          timing.adjustDuration(recordId, blockId, actualSeconds),
        "records:change-start": ({ recordId, blockId, startedAt }) =>
          timing.changeStart(recordId, blockId, startedAt),
        "records:change-leader": ({ recordId, blockId, personId }) =>
          timing.changeLeader(recordId, blockId, personId),
        "times:load": () => timing.loadTimes(),
        "sounds:list": () => media.sounds(),
        "projection:report-error": (message) => broadcast("projection:error", message),
        "monitors:list": () => monitors.list(),
        "projection:start": (input) => projection.start(input),
        "projection:stop": () => projection.stop(),
        "projection:get-status": () => projection.status(),
        "projection:push-frame": (frame) => projection.push(frame),
        "projection:request-frame": () => projection.frame(),
        "projection:video-time": (time) => broadcast("projection:video-time", time),
        "projection:set-default-background": (id) => consoleService.setDefaultBackground(id),
        "projection:preferences": () => {
          const saved = repository.getPreference<{
            id: number;
            bounds: { x: number; y: number; width: number; height: number };
          } | null>("projectionMonitor", null);
          const monitor = monitors
            .list()
            .find(
              (candidate) =>
                candidate.id === saved?.id &&
                JSON.stringify(candidate.bounds) === JSON.stringify(saved.bounds),
            );
          return { monitorId: monitor?.id ?? null };
        },
        "console:load": () => consoleService.load(),
        "plan:add": ({ kind, refId }) => consoleService.add(kind, refId),
        "plan:move": ({ id, position }) => consoleService.move(id, position),
        "plan:remove": (id) => consoleService.remove(id),
        "plan:clear": () => consoleService.clear(),
        "console:item": ({ kind, refId }) => consoleService.item(kind, refId, `quick:${refId}`),
        "songs:edit-slide": ({ songId, index, previousText, text }) =>
          consoleService.editSlide(songId, index, previousText, text),
        ...songsHandlers(songsService, songsRepository, audioMatch),
        ...settingsHandlers(new SettingsService(repository), app.getVersion(), home.root, {
          skipOnboarding: env.isE2e && !env.hasE2eOnboarding,
        }),
        ...mediaHandlers(media),
      },
      (name) => updates.assertCanUse(name),
    );
    void updates.check().catch(logError);
    void media.scan().catch(logError);
    let scanTimer: ReturnType<typeof setTimeout> | undefined;
    app.on("browser-window-focus", () => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        void media.scan().catch(logError);
      }, 500);
    });
    app.once("will-quit", () => clearTimeout(scanTimer));
    return { db, settings: repository };
  } catch (error) {
    db.close();
    throw error;
  }
}
