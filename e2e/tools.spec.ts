import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("changes projected typography, shows and pauses a timer, and retains typography after restart", async () => {
  const home = await mkdtemp(join(tmpdir(), "iris-tools-"));
  let instance: Awaited<ReturnType<typeof launchApp>> | undefined;
  try {
    instance = await launchApp({ home });
    let page = await instance.app.firstWindow();
    await page.evaluate(() =>
      window.iris["songs:create"]({
        title: "Texto de prueba",
        author: "",
        sections: [{ label: "Estrofa", text: "Sublime gracia del Señor" }],
        audioId: null,
      }),
    );
    await page.reload();
    await page
      .getByRole("region", { name: "Biblioteca", exact: true })
      .getByText("Texto de prueba", { exact: true })
      .dblclick();
    await page.getByRole("button", { name: "Proyectar", exact: true }).click();
    const opened = instance.app.waitForEvent("window");
    await page.getByRole("button", { name: "Iniciar proyección", exact: true }).click();
    const output = await opened;
    await page.getByRole("button", { name: "Enviar a la pantalla: Estrofa", exact: true }).click();
    await expect(output.getByText("Sublime gracia del Señor", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Herramientas", exact: true }).click();
    await page.getByRole("button", { name: "Texto", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Texto", exact: true });
    await dialog.getByRole("button", { name: /^Lora / }).click();
    await dialog.getByRole("button", { name: "Negrita", exact: true }).click();
    await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
    const projected = output.getByText("Sublime gracia del Señor", { exact: true });
    await expect
      .poll(() => projected.evaluate((element) => getComputedStyle(element).fontFamily))
      .toContain("Lora");
    await expect(projected).toHaveCSS("font-weight", "700");
    await page.getByRole("button", { name: "Herramientas", exact: true }).click();
    await page.getByRole("button", { name: "Temporizador", exact: true }).click();
    await page.getByLabel("Texto (opcional)", { exact: true }).fill("Empezamos en…");
    await page.getByRole("button", { name: "30 s", exact: true }).click();
    await expect(output.getByText("Empezamos en…", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    const before = await output.locator("main").innerText();
    await page.waitForTimeout(1100);
    expect(await output.locator("main").innerText()).toBe(before);
    await page.getByRole("button", { name: "Quitar de la pantalla", exact: true }).click();
    await expect(output.getByText("Empezamos en…", { exact: true })).toHaveCount(0);
    await instance.close();
    instance = undefined;
    instance = await launchApp({ home });
    page = await instance.app.firstWindow();
    const settings = await page.evaluate(() => window.iris["settings:get"]());
    expect(settings.ok && settings.data.projection).toMatchObject({
      fontFamily: "lora",
      fontBold: true,
    });
  } finally {
    if (instance) await instance.close();
    await rm(home, { recursive: true, force: true });
  }
});

test("adds a local sound, plays it and sends deletion to the trash adapter", async () => {
  const instance = await launchApp();
  try {
    const bytes = Buffer.alloc(44 + 16000);
    bytes.write("RIFF", 0);
    bytes.writeUInt32LE(bytes.length - 8, 4);
    bytes.write("WAVEfmt ", 8);
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(8000, 24);
    bytes.writeUInt32LE(16000, 28);
    bytes.writeUInt16LE(2, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write("data", 36);
    bytes.writeUInt32LE(16000, 40);
    const source = join(instance.home, "effect.wav");
    await writeFile(source, bytes);
    await instance.app.evaluate(({ shell }, home) => {
      const fs = process.getBuiltinModule("node:fs") as typeof import("node:fs");
      const path = process.getBuiltinModule("node:path") as typeof import("node:path");
      const trash = path.join(home, "TestTrash");
      fs.mkdirSync(trash);
      shell.trashItem = async (file) => {
        fs.renameSync(file, path.join(trash, path.basename(file)));
      };
    }, instance.home);
    const page = await instance.app.firstWindow();
    await page.evaluate(() => {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        Reflect.set(window, "lastPlayedAudio", this);
        return play.call(this);
      };
    });
    await page.getByRole("button", { name: "Herramientas", exact: true }).click();
    await page.getByRole("button", { name: "Sonidos", exact: true }).click();
    await expect(page.getByText("No tienes ningún sonido.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Agregar sonido", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Agregar sonido", exact: true });
    await dialog.locator('input[type="file"]').setInputFiles(source);
    await dialog.getByLabel("Nombre", { exact: true }).fill("Aplausos de prueba");
    await dialog.getByRole("button", { name: "Aplausos", exact: true }).click();
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Aplausos de prueba", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            (Reflect.get(window, "lastPlayedAudio") as HTMLAudioElement | undefined)?.src.includes(
              "iris-media://asset/",
            ),
          ),
        ),
      )
      .toBe(true);
    await page.getByRole("button", { name: "Eliminar «Aplausos de prueba»", exact: true }).click();
    await page
      .getByRole("dialog", { name: "¿Eliminar este sonido?", exact: true })
      .getByRole("button", { name: "Eliminar", exact: true })
      .click();
    await expect(page.getByText("No tienes ningún sonido.", { exact: true })).toBeVisible();
    expect((await stat(join(instance.home, "TestTrash", "effect.wav"))).isFile()).toBe(true);
  } finally {
    await instance.close();
  }
});
