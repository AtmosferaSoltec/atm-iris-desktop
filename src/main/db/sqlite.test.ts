import { expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteDatabase } from "./sqlite";
it("explains snapshot recovery for a corrupt database without modifying its contents", () => {
  const root = mkdtempSync(join(tmpdir(), "iris-corrupt-"));
  const path = join(root, "iris.db");
  try {
    writeFileSync(path, "invalid sqlite data");
    expect(() => new SqliteDatabase(path)).toThrow("restaurar el respaldo más reciente");
    expect(readFileSync(path, "utf8")).toBe("invalid sqlite data");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
