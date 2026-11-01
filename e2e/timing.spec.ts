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

test("adds a block during the service: saved in Tiempos, not in the service", async () => {
  const running = await launchApp();
  try {
    const page = await running.app.firstWindow();
    await page.evaluate(async () => {
      const result = await window.iris["service-types:create"]({
        name: "Culto de domingo",
        color: "amber",
        schedule: null,
        blocks: [
          { name: "Bienvenida", plannedMinutes: 5 },
          { name: "Mensaje", plannedMinutes: 30 },
        ],
      });
      if (!result.ok) throw new Error(result.error.message);
      const selected = await window.iris["service-types:select"](result.data.id);
      if (!selected.ok) throw new Error(selected.error.message);
    });
    await page.reload();
    await page.getByRole("button", { name: "Comenzar", exact: true }).click();
    await page.getByRole("button", { name: "Agregar bloque", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Agregar bloque" });
    await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(dialog.getByText("Escribe el nombre del bloque.")).toBeVisible();
    await dialog.getByLabel("Nombre", { exact: true }).fill("Santa cena");
    await dialog.getByLabel("Minutos", { exact: true }).fill("15");
    // Right after the running block by default.
    await expect(dialog.getByRole("combobox", { name: "Ubicación" })).toHaveText(
      "Antes de Mensaje",
    );
    await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
    await page.getByRole("button", { name: "Siguiente: Santa cena →" }).click();
    await expect(page.getByRole("button", { name: "Siguiente: Mensaje →" })).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(async () => {
          const result = await window.iris["times:load"](undefined);
          if (!result.ok) return null;
          return {
            record: result.data.records[0]?.blocks.map((block) => [
              block.name,
              block.plannedSeconds,
            ]),
            template: result.data.types[0]?.blocks.length,
          };
        }),
      )
      .toEqual({
        record: [
          ["Bienvenida", 300],
          ["Santa cena", 900],
          ["Mensaje", 1800],
        ],
        template: 2,
      });
  } finally {
    await running.close();
  }
});
