import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("creates the Iris home and retains church settings across restarts", async () => {
  const home = await mkdtemp(join(tmpdir(), "iris-settings-"));
  let instance: Awaited<ReturnType<typeof launchApp>> | undefined;
  try {
    instance = await launchApp({ home });
    let page = await instance.app.firstWindow();
    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Mi iglesia");
    expect(await readdir(home)).toEqual(
      expect.arrayContaining([
        "Audio",
        "Videos",
        "Images",
        "Backgrounds",
        "Sounds",
        "Backups",
        "Database",
      ]),
    );
    expect((await stat(join(home, "Database", "iris.db"))).isFile()).toBe(true);
    await page.getByLabel("Nombre", { exact: true }).fill("Iglesia Vida Nueva");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Cambios guardados", { exact: true })).toBeVisible();
    await instance.close();
    instance = undefined;
    instance = await launchApp({ home });
    page = await instance.app.firstWindow();
    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Iglesia Vida Nueva");
    const invalid = await page.evaluate(() =>
      window.iris["settings:update-church"]({ name: "", timezone: "bad" }),
    );
    expect(invalid).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    await page.reload();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Iglesia Vida Nueva");
  } finally {
    if (instance) await instance.close();
    await rm(home, { recursive: true, force: true });
  }
});
