import type { DatabaseSync as NativeDatabase, SQLInputValue, SQLOutputValue } from "node:sqlite";
import { AppError } from "@shared/errors";

// Suppress only SQLite's known experimental notice, without hiding other runtime warnings.
const emitWarning = process.emitWarning;
let DatabaseSync: typeof NativeDatabase;
try {
  process.emitWarning = ((...arguments_: unknown[]) => {
    if (String(arguments_[0]).startsWith("SQLite is an experimental feature")) return;
    Reflect.apply(emitWarning, process, arguments_);
  }) as typeof process.emitWarning;
  DatabaseSync = (process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite"))
    .DatabaseSync;
} finally {
  process.emitWarning = emitWarning;
}

export type SqlValue = SQLInputValue;
export type SqlRow = Record<string, SQLOutputValue>;

export class SqliteDatabase {
  private readonly connection: NativeDatabase;
  private isInTransaction = false;

  constructor(readonly path: string) {
    let connection: NativeDatabase | undefined;
    try {
      connection = new DatabaseSync(path);
      connection.exec(
        "PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
      );
      this.connection = connection;
    } catch (error) {
      connection?.close();
      const isCorrupt =
        error instanceof Error && /not a database|malformed|corrupt/i.test(error.message);
      throw new AppError(
        "INTERNAL",
        isCorrupt
          ? "La base de datos de Iris está dañada. Puedes restaurar el respaldo más reciente de la carpeta Backups: con Iris cerrado, conserva una copia de Database/iris.db y reemplázala por el respaldo. Los archivos multimedia no se modificaron."
          : "No pudimos abrir la base de datos de Iris. Revisa los permisos y el espacio del disco.",
      );
    }
  }
  exec(sql: string): void {
    this.connection.exec(sql);
  }
  prepare<T extends SqlRow = SqlRow>(
    sql: string,
  ): {
    get: (...parameters: SqlValue[]) => T | undefined;
    all: (...parameters: SqlValue[]) => T[];
    run: (...parameters: SqlValue[]) => {
      changes: number | bigint;
      lastInsertRowid: number | bigint;
    };
  } {
    const statement = this.connection.prepare(sql);
    return {
      get: (...parameters) => statement.get(...parameters) as T | undefined,
      all: (...parameters) => statement.all(...parameters) as T[],
      run: (...parameters) => statement.run(...parameters),
    };
  }
  transaction<T>(operation: () => T): T {
    if (this.isInTransaction) throw new Error("Las transacciones anidadas no están permitidas.");
    this.connection.exec("BEGIN IMMEDIATE");
    this.isInTransaction = true;
    try {
      const result = operation();
      if (result instanceof Promise) throw new Error("La transacción debe ser síncrona.");
      this.connection.exec("COMMIT");
      return result;
    } catch (error) {
      this.connection.exec("ROLLBACK");
      throw error;
    } finally {
      this.isInTransaction = false;
    }
  }
  close(): void {
    this.connection.close();
  }
}
