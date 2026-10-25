import { expect, test } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchApp } from "./helpers";

test("times a service, resumes it, and preserves a deleted leader in history", async () => {
  const home = await mkdtemp(join(tmpdir(), "iris-timing-"));
  let running = await launchApp({ home });
  try {
    let page = await running.app.firstWindow();
    await page.getByRole("button", { name: "Seleccionar servicio", exact: true }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Culto de prueba");
    await page.getByLabel("Nombre del bloque 1").fill("Bienvenida");
    await page.getByRole("button", { name: "Agregar bloque", exact: true }).click();
    await page.getByLabel("Nombre del bloque 2").fill("Mensaje");
    await page.getByRole("button", { name: "Crear y seleccionar" }).click();
    await page.getByRole("button", { name: "Comenzar", exact: true }).click();
    await page.getByTitle("Elegir quién dirige este bloque").click();
    await page.getByLabel("Buscar o agregar persona").fill("María Pérez");
    await page.getByRole("button", { name: "Agregar «María Pérez»" }).click();
    await expect(page.getByTitle("Elegir quién dirige este bloque")).toContainText("María Pérez");
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const result = await window.iris["times:load"](undefined);
          return result.ok ? result.data.records[0]?.blocks[0]?.personName : null;
        }),
      )
      .toBe("María Pérez");
    await running.close();
    running = await launchApp({ home });
    page = await running.app.firstWindow();
    await expect(page.getByTitle("Elegir quién dirige este bloque")).toContainText("María Pérez");
    await page.getByRole("button", { name: "Siguiente: Mensaje →" }).click();
    await page.getByRole("button", { name: "Finalizar servicio", exact: true }).click();
    await page.getByRole("button", { name: "Finalizar", exact: true }).click();
    await expect(page.getByText("Servicio finalizado", { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const result = await window.iris["times:load"](undefined);
          return result.ok ? result.data.records[0]?.status : null;
        }),
      )
      .toBe("finished");
    await page.evaluate(async () => {
      const people = await window.iris["people:list"](undefined);
      if (!people.ok) throw new Error(people.error.message);
      const result = await window.iris["people:delete"](people.data[0].id);
      if (!result.ok) throw new Error(result.error.message);
      location.hash = "/times";
    });
    await expect(page.getByRole("heading", { name: "Tiempos", exact: true })).toBeVisible();
    await expect(page.getByRole("article").getByText("María Pérez", { exact: true })).toBeVisible();
    await expect(page.getByRole("article").getByText("20:00", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "Resúmenes", exact: true }).click();
    await expect(page.getByText("Duración promedio", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/tab=summaries/);
  } finally {
    await running.close();
    await rm(home, { recursive: true, force: true });
  }
});
