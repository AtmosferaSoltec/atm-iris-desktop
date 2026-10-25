import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteDatabase } from "./sqlite";
import { migrate, MIGRATIONS } from "./migrate";
import { createTestDatabase } from "./test-database";

const resources: (() => void)[] = [];
afterEach(() => {
  for (const close of resources.splice(0).reverse()) close();
});
function memory(): SqliteDatabase {
  const db = new SqliteDatabase(":memory:");
  resources.push(() => db.close());
  return db;
}

describe("SQLite migrations", () => {
  it("creates the schema and applies required durability and foreign-key settings", () => {
    const db = createTestDatabase();
    resources.push(() => db.close());
    expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(MIGRATIONS.at(-1)?.version);
    expect(db.prepare("PRAGMA foreign_keys").get()?.foreign_keys).toBe(1);
    expect(db.prepare("PRAGMA synchronous").get()?.synchronous).toBe(2);
    expect(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((row) => row.name),
    ).toEqual(expect.arrayContaining(["church_settings", "projection_settings", "app_settings"]));
    migrate(db);
  });
  it("backs up a file before an upgrade and preserves its old contents", () => {
    const root = mkdtempSync(join(tmpdir(), "iris-migration-"));
    resources.push(() => rmSync(root, { recursive: true, force: true }));
    const db = new SqliteDatabase(join(root, "iris.db"));
    resources.push(() => db.close());
    db.exec("CREATE TABLE existing(value TEXT); INSERT INTO existing VALUES ('saved');");
    migrate(db, join(root, "Backups"));
    const files = readdirSync(join(root, "Backups"));
    expect(files).toHaveLength(1);
    const backup = new SqliteDatabase(join(root, "Backups", files[0]));
    resources.push(() => backup.close());
    expect(backup.prepare("PRAGMA user_version").get()?.user_version).toBe(0);
    expect(backup.prepare("SELECT value FROM existing").get()?.value).toBe("saved");
    expect(db.prepare("PRAGMA journal_mode").get()?.journal_mode).toBe("delete");
  });
  it("refuses a newer schema without modifying it", () => {
    const db = memory();
    db.exec("PRAGMA user_version=99");
    expect(() => migrate(db)).toThrow("más reciente");
    expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(99);
  });
  it("rolls back failed migrations and nested transactions", () => {
    const db = memory();
    expect(() =>
      migrate(db, undefined, [
        { version: 1, sql: "CREATE TABLE partial(id TEXT);" },
        { version: 2, sql: "invalid SQL" },
      ]),
    ).toThrow();
    expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(0);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name='partial'").get()).toBeUndefined();
    expect(() => db.transaction(() => db.transaction(() => undefined))).toThrow("anidadas");
  });
});
