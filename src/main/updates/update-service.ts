import { AppError } from "@shared/errors";
import { isNewerVersion, type UpdateStatus } from "@shared/schemas/updates";
import type { ChannelName } from "@shared/ipc/contract";
import type { SettingsRepository } from "../repositories/types";

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  isNewer: boolean;
};

export interface UpdatePort {
  check(): Promise<string | null>;
  download(progress: (percent: number) => void): Promise<void>;
  install(failed: (error: unknown) => void): void;
}
export type UpdateOptions = {
  version: string;
  isEnabled: boolean;
  settings: Pick<SettingsRepository, "getPreference" | "setPreference">;
  changed: (status: UpdateStatus) => void;
  prepareInstall: () => void;
  canInstall: () => boolean;
  reportError: (error: unknown) => void;
  timeoutMs?: number;
};
const REQUIRED_VERSION = "updates.requiredVersion";
const ALLOWED_CHANNELS: ReadonlySet<ChannelName> = new Set([
  "updates:status",
  "updates:retry",
  "updates:download",
  "updates:install",
  "app:info",
]);

export class UpdateService {
  private state: UpdateStatus;
  private operation: Promise<UpdateStatus> | null = null;
  private hasSessionStarted: boolean;
  /** The feed answered with a newer version in this run, so a failed download can be retried directly. */
  private hasFoundUpdate = false;
  constructor(
    private readonly port: UpdatePort,
    private readonly options: UpdateOptions,
  ) {
    const pending = options.settings.getPreference<unknown>(REQUIRED_VERSION, null);
    const nextVersion = isNewerVersion(pending, options.version) ? pending : null;
    if (pending !== null && !nextVersion) options.settings.setPreference(REQUIRED_VERSION, null);
    this.hasSessionStarted = !options.isEnabled;
    this.state = {
      phase: options.isEnabled ? "checking" : "disabled",
      currentVersion: options.version,
      nextVersion,
      isRequired: options.isEnabled && nextVersion !== null,
      progress: 0,
      message: null,
    };
  }
  status(): UpdateStatus {
    return { ...this.state };
  }
  assertCanUse(channel: ChannelName): void {
    if (!this.hasSessionStarted && !ALLOWED_CHANNELS.has(channel))
      throw new AppError(
        "CONFLICT",
        this.state.isRequired
          ? "Debes actualizar Iris para continuar."
          : "Espera mientras Iris busca actualizaciones.",
      );
  }
  private change(patch: Partial<UpdateStatus>): void {
    this.state = { ...this.state, ...patch };
    this.options.changed(this.status());
  }
  check(): Promise<UpdateStatus> {
    // Startup only: an operator who entered the console is never interrupted mid-service.
    if (this.hasSessionStarted || this.state.phase === "installing")
      return Promise.resolve(this.status());
    if (this.operation) return this.operation;
    this.operation = this.runCheck().finally(() => {
      this.operation = null;
    });
    return this.operation;
  }
  /**
   * "Buscar actualizaciones" in Ajustes: only asks the feed and reports, never touches the
   * startup flow, so it cannot lock the console in the middle of a service. A newer version is
   * then installed the next time Iris opens, through the usual mandatory screen.
   */
  async lookForUpdate(): Promise<UpdateCheckResult> {
    const currentVersion = this.options.version;
    if (!this.options.isEnabled)
      throw new AppError("CONFLICT", "Esta copia de Iris no se actualiza por internet.");
    if (this.state.phase === "installing")
      throw new AppError("CONFLICT", "Iris ya se está actualizando.");
    try {
      const latest = await this.checkWithTimeout();
      return {
        currentVersion,
        latestVersion: latest,
        isNewer: isNewerVersion(latest, currentVersion),
      };
    } catch (error) {
      this.options.reportError(error);
      throw new AppError(
        "OFFLINE",
        "No pudimos comprobar actualizaciones. Revisa la conexión a internet.",
      );
    }
  }
  private async runCheck(): Promise<UpdateStatus> {
    this.change({ phase: "checking", message: null, progress: 0 });
    try {
      const version = await this.checkWithTimeout();
      if (!isNewerVersion(version, this.options.version)) {
        if (this.state.isRequired) throw new Error("The mandatory release is not available.");
        this.hasSessionStarted = true;
        this.change({ phase: "current" });
        return this.status();
      }
      if (this.state.nextVersion && isNewerVersion(this.state.nextVersion, version))
        throw new Error("The feed is older than the required release.");
      // Persist before offering it: restarting or losing connectivity cannot dismiss an update.
      this.options.settings.setPreference(REQUIRED_VERSION, version);
      this.hasFoundUpdate = true;
      // The operator decides when to download: nothing starts on its own.
      this.change({ phase: "available", nextVersion: version, isRequired: true });
    } catch (error) {
      this.options.reportError(error);
      if (this.state.isRequired)
        this.change({
          phase: "error",
          message:
            "No pudimos preparar la actualización obligatoria. Revisa la conexión y el espacio disponible, y vuelve a intentarlo.",
        });
      else {
        this.hasSessionStarted = true;
        this.change({
          phase: "offline",
          message: "No pudimos comprobar actualizaciones. Iris seguirá funcionando sin conexión.",
        });
      }
    }
    return this.status();
  }
  /** Downloads the update the operator was offered (or retries a failed download). */
  download(): Promise<UpdateStatus> {
    if (this.operation) return this.operation;
    const canDownload =
      this.state.isRequired &&
      this.hasFoundUpdate &&
      (this.state.phase === "available" || this.state.phase === "error");
    if (!canDownload) throw new AppError("CONFLICT", "No hay una actualización para descargar.");
    this.operation = this.runDownload().finally(() => {
      this.operation = null;
    });
    return this.operation;
  }
  private async runDownload(): Promise<UpdateStatus> {
    this.change({ phase: "downloading", progress: 0, message: null });
    try {
      await this.port.download((percent) => {
        if (this.state.phase === "downloading" && Number.isFinite(percent))
          this.change({ progress: Math.min(100, Math.max(this.state.progress, percent)) });
      });
      this.change({ phase: "ready", progress: 100 });
    } catch (error) {
      this.options.reportError(error);
      this.change({
        phase: "error",
        message:
          "No pudimos descargar la actualización. Revisa la conexión y el espacio disponible, y vuelve a intentarlo.",
      });
    }
    return this.status();
  }
  /** After an error: retry the download if the update is known, otherwise check again. */
  retry(): Promise<UpdateStatus> {
    return this.hasFoundUpdate && this.state.phase === "error" ? this.download() : this.check();
  }
  private async checkWithTimeout(): Promise<string | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.port.check(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("Update check timed out")),
            this.options.timeoutMs ?? 12000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  private installFailed(error: unknown): void {
    this.options.reportError(error);
    this.change({
      phase: "error",
      message:
        "No pudimos instalar la actualización. Tus datos siguen en Iris. Comprueba los permisos y el espacio disponible, y vuelve a intentarlo.",
    });
  }
  install(): UpdateStatus {
    if (this.state.phase !== "ready" || !this.state.isRequired)
      throw new AppError("CONFLICT", "La actualización todavía no está lista.");
    if (!this.options.canInstall())
      throw new AppError("CONFLICT", "Detén la proyección antes de actualizar Iris.");
    try {
      this.options.prepareInstall();
      this.change({ phase: "installing", message: null });
      this.port.install((error) => this.installFailed(error));
    } catch (error) {
      this.installFailed(error);
    }
    return this.status();
  }
}
