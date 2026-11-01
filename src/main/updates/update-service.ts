import { AppError } from "@shared/errors";
import { isNewerVersion, type UpdateStatus } from "@shared/schemas/updates";
import type { ChannelName } from "@shared/ipc/contract";
import type { SettingsRepository } from "../repositories/types";

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
  "updates:install",
  "app:info",
]);

export class UpdateService {
  private state: UpdateStatus;
  private operation: Promise<UpdateStatus> | null = null;
  private hasSessionStarted: boolean;
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
      // Persist before downloading: restarting or losing connectivity cannot dismiss an update.
      this.options.settings.setPreference(REQUIRED_VERSION, version);
      this.change({ phase: "downloading", nextVersion: version, isRequired: true });
      await this.port.download((percent) => {
        if (this.state.phase === "downloading" && Number.isFinite(percent))
          this.change({ progress: Math.min(100, Math.max(this.state.progress, percent)) });
      });
      this.change({ phase: "ready", progress: 100 });
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
