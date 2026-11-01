import { expect, test } from "@playwright/test";
import { launchApp } from "./helpers";

test("deletes a service from the chooser and keeps the times already saved", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      const result = await window.iris["service-types:create"]({
        name: "Culto de prueba",
        color: "amber",
        schedule: null,
        blocks: [{ name: "Bienvenida", plannedMinutes: 5 }],
      });
      if (!result.ok) throw new Error(result.error.message);
    });
    await page.reload();
    await page.getByRole("button", { name: "Seleccionar servicio", exact: true }).click();
    await expect(page.getByText("Culto de prueba", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar el servicio Culto de prueba" }).click();
    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    // With no services left, the chooser goes straight to creating one.
    await expect(page.getByRole("heading", { name: "Crear servicio" })).toBeVisible();
    const times = await page.evaluate(() => window.iris["times:load"](undefined));
    if (!times.ok) throw new Error(times.error.message);
    expect(times.data.types).toHaveLength(0);
  } finally {
    await instance.close();
  }
});

test("changes the real start of a block: it lasts longer and the service starts earlier", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    const base = Date.UTC(2026, 9, 4, 15, 33);
    const times = await page.evaluate(async (start) => {
      const iso = (minutes: number): string => new Date(start + minutes * 60_000).toISOString();
      const block = (
        name: string,
        from: number,
        to: number,
      ): {
        id: string;
        name: string;
        plannedSeconds: number;
        actualSeconds: number;
        personId: null;
        personName: null;
        status: "completed";
        startedAt: string;
        endedAt: string;
      } => ({
        id: crypto.randomUUID(),
        name,
        plannedSeconds: 300,
        actualSeconds: (to - from) * 60,
        personId: null,
        personName: null,
        status: "completed" as const,
        startedAt: iso(from),
        endedAt: iso(to),
      });
      const saved = await window.iris["records:save"]({
        id: crypto.randomUUID(),
        input: {
          status: "finished",
          date: iso(0),
          serviceTypeId: null,
          serviceTypeName: "Culto",
          blocks: [block("Bienvenida", 0, 5), block("Mensaje", 5, 35)],
        },
      });
      if (!saved.ok) throw new Error(saved.error.message);
      const loaded = await window.iris["times:load"](undefined);
      if (!loaded.ok) throw new Error(loaded.error.message);
      return loaded.data.timeZone;
    }, base);
    const local = new Intl.DateTimeFormat("en-GB", {
      timeZone: times,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(base - 3 * 60_000));

    await page.getByRole("link", { name: "Tiempos" }).click();
    await page.getByRole("button", { name: "Opciones del bloque Bienvenida" }).click();
    await page.getByRole("menuitem", { name: "Cambiar hora de inicio…" }).click();
    await page.getByLabel("Hora de inicio", { exact: true }).fill(local);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Hora de inicio actualizada")).toBeVisible();

    const result = await page.evaluate(() => window.iris["times:load"](undefined));
    if (!result.ok) throw new Error(result.error.message);
    const [record] = result.data.records;
    expect(Date.parse(record!.date)).toBe(base - 3 * 60_000);
    expect(record!.blocks[0]).toMatchObject({ actualSeconds: 8 * 60, status: "adjusted" });
    expect(record!.blocks[1]!.actualSeconds).toBe(30 * 60);
  } finally {
    await instance.close();
  }
});
