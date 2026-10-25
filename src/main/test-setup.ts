import { afterAll, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const home = mkdtempSync(join(tmpdir(), "iris-unit-home-"));
vi.stubEnv("IRIS_HOME", home);
vi.stubGlobal(
  "fetch",
  vi.fn(async () => {
    throw new TypeError("La red está deshabilitada en las pruebas.");
  }),
);
afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(home, { recursive: true, force: true });
});
