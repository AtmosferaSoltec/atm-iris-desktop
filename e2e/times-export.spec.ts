import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { launchApp } from "./helpers";

test("filters the records by months and downloads them as a table and as a PDF report", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      for (const date of ["2026-09-06T15:00:00Z", "2026-10-04T15:00:00Z", "2026-12-06T15:00:00Z"]) {
        const result = await window.iris["records:save"]({
          id: crypto.randomUUID(),
          input: {
            status: "finished",
            date,
            serviceTypeId: null,
            serviceTypeName: "Culto",
            blocks: [
              {
                id: crypto.randomUUID(),
                name: "Alabanza",
                plannedSeconds: 600,
                actualSeconds: 700,
                personId: null,
                personName: "Ana",
                status: "completed",
                startedAt: null,
                endedAt: null,
              },
            ],
          },
        });
        if (!result.ok) throw new Error(result.error.message);
      }
    });
    await page.getByRole("link", { name: "Tiempos" }).click();
    await expect(page.getByText("3 servicios")).toBeVisible();
    await page.getByRole("combobox", { name: "Desde el mes" }).click();
    await page.getByRole("option", { name: "Octubre 2026" }).click();
    await expect(page.getByText("2 servicios")).toBeVisible();
    await page.getByRole("combobox", { name: "Hasta el mes" }).click();
    await page.getByRole("option", { name: "Octubre 2026" }).click();
    await expect(page.getByText("1 servicio", { exact: true })).toBeVisible();

    const csv = join(instance.home, "tiempos.csv");
    const pdf = join(instance.home, "tiempos.pdf");
    let target = csv;
    await instance.app.evaluate(
      ({ dialog }, paths) => {
        dialog.showSaveDialog = async (options) => ({
          canceled: false,
          filePath: String(options && "defaultPath" in options && options.defaultPath).endsWith(
            ".pdf",
          )
            ? paths.pdf
            : paths.csv,
        });
      },
      { csv, pdf },
    );
    await page.getByRole("button", { name: "Descargar" }).click();
    await page.getByRole("menuitem", { name: /Tabla \(CSV/ }).click();
    await expect(page.getByText("Se guardó la tabla con 1 servicio")).toBeVisible();
    const text = await readFile(target, "utf8");
    expect(text).toContain("Alabanza");
    expect(text).toContain("2026-10-04");
    expect(text).not.toContain("2026-09-06");

    target = pdf;
    await page.getByRole("button", { name: "Descargar" }).click();
    await page.getByRole("menuitem", { name: "Informe en PDF" }).click();
    await expect(page.getByText("Se guardó el informe con 1 servicio")).toBeVisible();
    expect((await readFile(target)).subarray(0, 4).toString()).toBe("%PDF");
  } finally {
    await instance.close();
  }
});
