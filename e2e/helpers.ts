import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { _electron, type ElectronApplication } from "@playwright/test";

export async function launchApp(
  options: { home?: string; rendererUrl?: string; updates?: string } = {},
): Promise<{
  app: ElectronApplication;
  home: string;
  close: () => Promise<void>;
}> {
  const home = options.home ?? (await mkdtemp(join(tmpdir(), "iris-e2e-")));
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    IRIS_HOME: home,
    IRIS_E2E: "1",
    IRIS_E2E_UPDATES: options.updates,
    ELECTRON_RENDERER_URL: options.rendererUrl,
  };
  delete environment.ELECTRON_RUN_AS_NODE;
  try {
    const app = await _electron.launch({
      args: [resolve("out/main/index.js")],
      env: Object.fromEntries(
        Object.entries(environment).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
    });
    await app.context().route(/^https?:/, (route) => {
      const host = new URL(route.request().url()).hostname;
      return ["localhost", "127.0.0.1", "[::1]"].includes(host) ? route.continue() : route.abort();
    });
    await app.evaluate(() => {
      globalThis.fetch = async () => {
        throw new TypeError("La red está deshabilitada en las pruebas.");
      };
    });
    return {
      app,
      home,
      close: async () => {
        await app.close();
        if (!options.home) await rm(home, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (!options.home) await rm(home, { recursive: true, force: true });
    throw error;
  }
}
