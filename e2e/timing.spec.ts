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
    const order = dialog.getByRole("list", { name: "Orden de los bloques" }).getByRole("listitem");
    // Right after the running block by default; dragged below "Mensaje" it goes last.
    await expect(order).toHaveText([/Bienvenida/, /Santa cena/, /Mensaje/]);
    const draft = dialog.getByRole("button", { name: "Mover «Santa cena»" });
    const target = (await order.nth(2).boundingBox())!;
    await draft.hover();
    await page.mouse.down();
    await page.mouse.move(target.x + 40, target.y + target.height * 0.9, { steps: 12 });
    await page.mouse.up();
    await expect(order).toHaveText([/Bienvenida/, /Mensaje/, /Santa cena/]);
    await page.screenshot({ path: test.info().outputPath("add-block.png") });
    await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Siguiente: Mensaje →" })).toBeVisible();
    await expect(dialog).toHaveCount(0);

    // Placed by mistake: corrected from the block list before it starts.
    await page.getByRole("button", { name: "Editar el bloque Santa cena" }).click();
    const editor = page.getByRole("dialog", { name: "Editar bloque" });
    await expect(editor.getByLabel("Minutos", { exact: true })).toHaveValue("15");
    await editor.getByRole("button", { name: "Subir", exact: true }).click();
    await editor.getByLabel("Nombre", { exact: true }).fill("Santa Cena");
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByRole("button", { name: "Siguiente: Santa Cena →" }).click();
    await expect(page.getByRole("button", { name: "Siguiente: Mensaje →" })).toBeVisible();
    // Once it runs it is a block like the others.
    await expect(page.getByRole("button", { name: /^Editar el bloque/ })).toHaveCount(0);

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
          ["Santa Cena", 900],
          ["Mensaje", 1800],
        ],
        template: 2,
      });
  } finally {
    await running.close();
  }
});

test("Tiempos shows each block's start and end on a 12-hour clock and swaps two blocks", async () => {
  const running = await launchApp();
  try {
    const page = await running.app.firstWindow();
    await page.evaluate(async () => {
      // Lima is UTC−5: 01:01 UTC is 8:01 p. m. the evening before.
      const at = (minute: number): string =>
        new Date(Date.UTC(2026, 10, 2, 1, minute)).toISOString();
      type BlockInput = Parameters<
        (typeof window.iris)["records:save"]
      >[0]["input"]["blocks"][number];
      const block = (name: string, planned: number, from: number, to: number): BlockInput => ({
        id: crypto.randomUUID(),
        name,
        plannedSeconds: planned,
        actualSeconds: (to - from) * 60,
        personId: null,
        personName: null,
        status: "completed" as const,
        startedAt: at(from),
        endedAt: at(to),
      });
      const result = await window.iris["records:save"]({
        id: crypto.randomUUID(),
        input: {
          status: "finished",
          date: at(1),
          serviceTypeId: null,
          serviceTypeName: "Culto general",
          blocks: [block("Anuncios", 600, 1, 9), block("Consagración", 300, 9, 17)],
        },
      });
      if (!result.ok) throw new Error(result.error.message);
      location.hash = "/times";
    });
    const detail = page.getByRole("article");
    await expect(detail.getByText("de 8:01 p. m. a 8:09 p. m.")).toBeVisible();
    await detail.getByRole("button", { name: "Opciones del bloque Anuncios" }).click();
    await page.getByRole("menuitem", { name: "Intercambiar con otro bloque…" }).click();
    const dialog = page.getByRole("dialog", { name: "Intercambiar bloques" });
    await expect(dialog.getByText("Consagración · 8:01 p. m.")).toBeVisible();
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    );
    await page.screenshot({ path: test.info().outputPath("swap-blocks.png") });
    await dialog.getByRole("button", { name: "Intercambiar", exact: true }).click();
    await expect(page.getByText("Bloques intercambiados")).toBeVisible();
    const names = detail.getByRole("region", { name: "Bloques" }).getByRole("listitem");
    await expect(names.first()).toContainText("Consagración");
    await expect(names.first()).toContainText("de 8:01 p. m. a 8:09 p. m.");
    await expect(names.nth(1)).toContainText("Anuncios");
    await expect(names.nth(1)).toContainText("previsto 10:00");
  } finally {
    await running.close();
  }
});
