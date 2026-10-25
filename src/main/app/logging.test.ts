import { expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeLogging, logError } from "./logging";
it("rotates a full local log and continues writing", () => {
  const root = mkdtempSync(join(tmpdir(), "iris-log-"));
  try {
    initializeLogging(root);
    writeFileSync(join(root, "iris.log"), "x".repeat(1_048_577));
    logError(new Error("Prueba de rotación"));
    expect(readFileSync(join(root, "iris.log.1"), "utf8")).toHaveLength(1_048_577);
    expect(readFileSync(join(root, "iris.log"), "utf8")).toContain("Prueba de rotación");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
