import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { silentMp3 } from "./audio-fixture";
import { launchApp } from "./helpers";

test("keeps clear-screen active across songs and controls local audio volume", async () => {
  const instance = await launchApp();
  try {
    await writeFile(join(instance.home, "Audio", "local.mp3"), silentMp3());
    const page = await instance.app.firstWindow();
    await page.evaluate(async () => {
      await window.iris["media:scan"](undefined);
      const files = await window.iris["media:list"]({
        kind: "audio",
        role: "track",
        search: "",
        page: 1,
        limit: 20,
      });
      if (!files.ok) throw new Error(files.error.message);
      const audioId = files.data.data[0].id;
      await window.iris["media:set-measures"]({
        id: audioId,
        durationSeconds: 316,
        width: null,
        height: null,
      });
      for (const [title, text, audio] of [
        ["Primera", "Letra primera", audioId],
        ["Segunda", "Letra segunda", null],
      ]) {
        const song = await window.iris["songs:create"]({
          title: title!,
          author: "Autor",
          sections: [{ label: null, text: text! }],
          audioId: audio,
        });
        if (!song.ok) throw new Error(song.error.message);
        await window.iris["plan:add"]({ kind: "song", refId: song.data.song.id });
      }
    });
    await page.reload();
    const service = page.getByRole("region", { name: "Servicio", exact: true });
    await expect(service.getByRole("img", { name: "Audio MP3", exact: true })).toHaveCount(1);
    await expect(service.getByText("5:16", { exact: true })).toBeVisible();
    await expect(
      service.getByRole("button", { name: "Vaciar servicio", exact: true }),
    ).toBeVisible();
    const slides = page.getByRole("list", { name: "Diapositivas", exact: true });
    await expect(slides.getByRole("button")).toHaveCount(1);
    await slides.getByRole("button").click();
    const live = page.getByRole("region", { name: "Pantalla en vivo", exact: true });
    await expect(live.getByText("Letra primera", { exact: true })).toBeVisible();
    const clear = live.getByRole("button", { name: "Limpiar pantalla (B)", exact: true });
    await clear.click();
    await expect(clear).toHaveAttribute("aria-pressed", "true");
    await service.getByText("Segunda", { exact: true }).click();
    await slides.getByRole("button").click();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const result = await window.iris["projection:request-frame"](undefined);
          return result.ok ? result.data.content.kind : "error";
        }),
      )
      .toBe("blank");
    await expect(clear).toHaveAttribute("aria-pressed", "true");
    await clear.click();
    await expect(live.getByText("Letra segunda", { exact: true })).toBeVisible();
    await live.getByRole("button", { name: "Volumen", exact: true }).click();
    await page.getByRole("slider", { name: "Volumen", exact: true }).fill("25");
    await expect(page.getByText("25 %", { exact: true })).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("operator-controls.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await service.getByText("Primera", { exact: true }).click();
    await page.evaluate(() => {
      const NativeAudio = window.Audio;
      window.Audio = class extends NativeAudio {
        constructor() {
          super();
          Reflect.set(window, "testRoomAudio", this);
        }
      };
    });
    await live
      .getByRole("button", { name: "Reproducir la pista de «Primera»", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() => (Reflect.get(window, "testRoomAudio") as HTMLAudioElement)?.volume),
      )
      .toBe(0.25);
    await expect(live.getByText("Sonando en el salón", { exact: true })).toBeVisible();
    await live.getByRole("button", { name: "Pausar", exact: true }).click();
    await expect(live.getByText("En pausa", { exact: true })).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
  } finally {
    await instance.close();
  }
});
