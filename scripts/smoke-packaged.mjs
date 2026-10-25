import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { readFileSync } from "node:fs";
import { _electron } from "@playwright/test";

const executablePath = process.argv[2];
if (!executablePath) throw new Error("Indica la ruta del ejecutable empaquetado de Iris.");
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const home = await mkdtemp(join(tmpdir(), "iris-packaged-"));
const environment = { ...process.env, IRIS_HOME: home, IRIS_E2E: "1" };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.ELECTRON_RENDERER_URL;
let app;
try {
  app = await _electron.launch({
    executablePath: resolve(executablePath),
    args: [],
    env: environment,
  });
  await app.context().route(/^https?:/, (route) => route.abort());
  const page = await app.firstWindow();
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  assert.equal(await page.title(), "Iris");
  assert.deepEqual(
    await app.evaluate(({ app }) => ({
      name: app.getName(),
      version: app.getVersion(),
      isPackaged: app.isPackaged,
    })),
    { name: "Iris", version, isPackaged: true },
  );
  const result = await page.evaluate(() => window.iris["bible:status"](undefined));
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.translations, []);
  console.log(
    `Iris ${version}: aplicación empaquetada, consola e IPC verificados con un perfil temporal.`,
  );
} finally {
  try {
    await app?.close();
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}
