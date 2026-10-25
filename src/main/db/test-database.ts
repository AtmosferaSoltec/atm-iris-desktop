import { SqliteDatabase } from "./sqlite";
import { migrate } from "./migrate";

export function createTestDatabase(): SqliteDatabase {
  const db = new SqliteDatabase(":memory:");
  migrate(db);
  return db;
}
