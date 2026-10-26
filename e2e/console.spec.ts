import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("adds by double click and drag, presents only on stage click, reorders and persists the service", async () => {
  const home = await mkdtemp(join(tmpdir(), "iris-console-"));
  let instance: Awaited<ReturnType<typeof launchApp>> | undefined;
  try {
    instance = await launchApp({ home });
    let page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      for (const title of ["Primera canción", "Segunda canción"])
        await window.iris["songs:create"]({
          title,
          author: "",
          sections: [
            { label: "Estrofa 1", text: `${title} uno` },
            { label: "Coro", text: `${title} dos` },
          ],
          audioId: null,
        });
    });
    await page.reload();
    const library = page.getByRole("region", { name: "Biblioteca", exact: true });
    const service = page.getByRole("region", { name: "Servicio", exact: true });
    const live = page.getByRole("region", { name: "Pantalla en vivo", exact: true });
    await library.getByText("Primera canción", { exact: true }).dblclick();
    await expect(service.getByText("Primera canción", { exact: true })).toBeVisible();
    await expect(live.getByText("Primera canción uno", { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Enviar a la pantalla: Estrofa 1", exact: true })
      .click();
    await expect(live.getByText("Primera canción uno", { exact: true })).toBeVisible();
    const source = await library.getByText("Segunda canción", { exact: true }).boundingBox();
    const target = await service.boundingBox();
    if (!source || !target) throw new Error("No se encontraron los paneles.");
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 });
    await page.mouse.up();
    // dnd-kit suppresses the synthetic click immediately following a pointer drop.
    await page.waitForTimeout(75);
    await expect(service.getByText("Segunda canción", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Segunda canción", exact: true })).toBeVisible();
    await expect(live.getByText("Primera canción uno", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Enviar a la pantalla: Estrofa 1", exact: true })
      .click();
    await expect(live.getByText("Segunda canción uno", { exact: true })).toBeVisible();
    await page.keyboard.press("b");
    await expect(live.getByText("Segunda canción uno", { exact: true })).toHaveCount(0);
    await page.keyboard.press("b");
    await expect(live.getByText("Segunda canción uno", { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(live.getByText("Segunda canción dos", { exact: true })).toBeVisible();
    const mover = service.getByRole("button", { name: "Mover «Segunda canción»", exact: true });
    await mover.focus();
    await page.keyboard.press("Space");
    await expect(mover).toHaveAttribute("aria-pressed", "true");
    // The keyboard sensor installs its document listener on the next task.
    await page.waitForTimeout(75);
    await page.keyboard.press("ArrowUp");
    await expect(page.getByText("Sobre el lugar 1.", { exact: true })).toHaveCount(1);
    await page.keyboard.press("Space");
    await expect(service.locator("ol > li").first()).toContainText("Segunda canción");
    await service.getByRole("button", { name: "Quitar «Primera canción»", exact: true }).click();
    await expect(service.locator("ol > li")).toHaveCount(1);
    await instance.close();
    instance = undefined;
    instance = await launchApp({ home });
    page = await instance.app.firstWindow();
    await expect(
      page.getByRole("region", { name: "Servicio", exact: true }).locator("ol > li"),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Vaciar servicio", exact: true }).click();
    await page.getByRole("button", { name: "Quitar 1 elemento", exact: true }).click();
    await expect(page.getByText("Servicio vacío", { exact: true })).toBeVisible();
  } finally {
    if (instance) await instance.close();
    await rm(home, { recursive: true, force: true });
  }
});

test("deleting a song from the library removes its service entries", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await page.evaluate(() =>
      window.iris["songs:create"]({
        title: "Canción para eliminar",
        author: "",
        sections: [{ label: null, text: "Texto" }],
        audioId: null,
      }),
    );
    await page.reload();
    const library = page.getByRole("region", { name: "Biblioteca", exact: true });
    await library.getByText("Canción para eliminar", { exact: true }).dblclick();
    await expect(
      page
        .getByRole("region", { name: "Servicio", exact: true })
        .getByText("Canción para eliminar", { exact: true }),
    ).toBeVisible();
    await library.getByText("Canción para eliminar", { exact: true }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Eliminar", exact: true }).click();
    await page
      .getByRole("dialog", { name: "¿Eliminar «Canción para eliminar»?", exact: true })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click();
    await expect(page.getByText("Servicio vacío", { exact: true })).toBeVisible();
    const result = await page.evaluate(() => window.iris["console:load"]());
    expect(result.ok && result.data.items.length).toBe(0);
  } finally {
    await instance.close();
  }
});
