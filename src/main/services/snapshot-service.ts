import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { zonedParts } from "@shared/lib/zoned-time";
import { AppError } from "@shared/errors";
import type { IrisHome } from "../files/iris-home";
import type { SettingsRepository } from "../repositories/types";
import type { SqliteMaintenanceRepository } from "../repositories/sqlite/maintenance-repository";

export class SnapshotService {
  constructor(
    private readonly repository: SqliteMaintenanceRepository,
    private readonly settings: SettingsRepository,
    private readonly home: IrisHome,
  ) {}
  create(isManual = false, now = new Date()): string | null {
    const parts = zonedParts(now, this.settings.get().church.timezone);
    const date = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    if (!isManual && this.settings.getPreference("lastSnapshotDate", "") === date) return null;
    const name = `iris-${date}${isManual ? `-${now.getTime()}` : ""}.db`;
    const path = this.home.resolveInside(`Backups/${name}`);
    const hasExisting = existsSync(path);
    let hasWritten = hasExisting;
    try {
      if (!hasExisting) {
        this.repository.snapshot(path);
        hasWritten = true;
      }
      if (!isManual) this.settings.setPreference("lastSnapshotDate", date);
      const names = readdirSync(this.home.resolveInside("Backups"))
        .filter((file) => /^iris-\d{4}-\d{2}-\d{2}(?:-\d+)?\.db$/.test(file))
        .sort(
          (a, b) =>
            b.slice(5, 15).localeCompare(a.slice(5, 15)) ||
            Number(b.match(/-(\d+)\.db$/)?.[1] ?? 0) - Number(a.match(/-(\d+)\.db$/)?.[1] ?? 0),
        );
      for (const old of names.slice(7)) unlinkSync(this.home.resolveInside(`Backups/${old}`));
      return name;
    } catch {
      if (!hasWritten && existsSync(path)) unlinkSync(path);
      throw new AppError(
        "INTERNAL",
        "No pudimos crear el respaldo. Revisa el espacio y los permisos de la carpeta de Iris.",
      );
    }
  }
}
