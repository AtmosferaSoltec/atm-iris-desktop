import bibleSql from "./migrations/0009-bible.sql?raw";
import youtubeSql from "./migrations/0008-youtube.sql?raw";
import peopleSql from "./migrations/0005-people.sql?raw";
import serviceTypesSql from "./migrations/0006-service-types.sql?raw";
import recordsSql from "./migrations/0007-service-records.sql?raw";
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import planSql from "./migrations/0004-service-plan.sql?raw";
import songsSql from "./migrations/0003-songs.sql?raw";
import mediaSql from "./migrations/0002-media.sql?raw";
import settingsSql from "./migrations/0001-settings.sql?raw";
import { AppError } from "@shared/errors";
import type { SqliteDatabase } from "./sqlite";

export type Migration = { version: number; sql: string };
export const MIGRATIONS: Migration[] = [
  { version: 1, sql: settingsSql },
  { version: 2, sql: mediaSql },
  { version: 3, sql: songsSql },
  { version: 4, sql: planSql },
  { version: 5, sql: peopleSql },
  { version: 6, sql: serviceTypesSql },
  { version: 7, sql: recordsSql },
  { version: 8, sql: youtubeSql },
  { version: 9, sql: bibleSql },
];

export function migrate(db: SqliteDatabase, backupsDir?: string, migrations = MIGRATIONS): void {
  const version = Number(db.prepare("PRAGMA user_version").get()?.user_version ?? 0);
  const target = migrations.at(-1)?.version ?? 0;
  if (version > target)
    throw new AppError(
      "CONFLICT",
      "Esta base de datos pertenece a una versión más reciente de Iris. Actualiza la aplicación para abrirla.",
    );
  const pending = migrations.filter((migration) => migration.version > version);
  if (!pending.length) return;
  if (db.path !== ":memory:") {
    if (!backupsDir) throw new AppError("INTERNAL", "No encontramos la carpeta de respaldos.");
    mkdirSync(backupsDir, { recursive: true });
    const timestamp = new Date().toISOString().replaceAll(":", "-");
    copyFileSync(
      db.path,
      join(backupsDir, `pre-migration-${version}-to-${target}-${timestamp}.db`),
    );
  }
  db.transaction(() => {
    let expected = version + 1;
    for (const migration of pending) {
      if (migration.version !== expected++)
        throw new AppError("INTERNAL", "Falta una actualización de la base de datos.");
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version=${migration.version}`);
    }
  });
}
