import { expect, test } from "@playwright/test";
import { launchApp } from "./helpers";

test("saves a YouTube link, adds it to the plan and keeps the player sandboxed", async () => {
  const instance = await launchApp();
  try {
    await instance.app.evaluate(() => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ title: "Video de prueba", author_name: "Autor" }));
    });
    const page = await instance.app.firstWindow();
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route(/^https?:/, async (route) => {
      if (route.request().url().endsWith("/iframe_api"))
        await route.fulfill({
          contentType: "text/javascript",
          body: `window.YT={Player:class {constructor(element,options){this.options=options;queueMicrotask(()=>options.events.onReady());}playVideo(){}pauseVideo(){}seekTo(){}mute(){}unMute(){}getCurrentTime(){return 2}getDuration(){return 120}getPlayerState(){return 1}loadModule(){}unloadModule(){}destroy(){}}};window.onYouTubeIframeAPIReady();`,
        });
      else await route.abort();
    });
    await page.getByRole("radio", { name: "Multimedia", exact: true }).click();
    await page.getByRole("radio", { name: "YouTube", exact: true }).click();
    await page.getByRole("button", { name: "Agregar enlace", exact: true }).click();
    await page.getByLabel("Enlace", { exact: true }).fill("https://youtu.be/M7lc1UVf-VE");
    await page.getByRole("button", { name: "Guardar en la biblioteca" }).click();
    const tile = page.getByTitle(/^Video de prueba:/);
    await expect(tile.getByText("Video de prueba", { exact: true })).toBeVisible();
    await expect(tile.getByText("YouTube · Autor", { exact: true })).toBeVisible();
    await expect(tile.getByRole("img")).toHaveAttribute("src", /M7lc1UVf-VE/);
    await tile.getByRole("button", { name: "Agregar «Video de prueba» al servicio" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page
        .getByRole("region", { name: "Servicio", exact: true })
        .getByText("Video de prueba", { exact: true }),
    ).toBeVisible();
    await tile.dblclick();
    const player = page.frameLocator('iframe[title="Reproductor de YouTube"]').first();
    await expect
      .poll(async () => {
        const frame = await page
          .locator('iframe[title="Reproductor de YouTube"]')
          .first()
          .contentFrame()
          .locator("body")
          .count();
        return { frame, errors: errors.filter((error) => error.includes("module script")) };
      })
      .toEqual({ frame: 1, errors: [] });
    await expect
      .poll(async () => ({
        yt: await player.locator("body").evaluate(() => Reflect.has(window, "YT")),
        errors: errors.filter((message) => !message.includes("ERR_FAILED")),
      }))
      .toEqual({ yt: true, errors: [] });
    await expect(
      page
        .getByRole("region", { name: "Pantalla en vivo", exact: true })
        .getByRole("slider", { name: "Posición" }),
    ).toHaveAttribute("max", "120");
    expect(await player.locator("body").evaluate(() => typeof window.iris)).toBe("undefined");
    expect(
      await player.locator("body").evaluate(() => {
        try {
          return typeof window.parent.iris;
        } catch {
          return "blocked";
        }
      }),
    ).toBe("blocked");
    await instance.app.evaluate(() => {
      globalThis.fetch = async () => {
        throw new TypeError("offline");
      };
    });
    await page.getByRole("button", { name: "Agregar enlace", exact: true }).click();
    await page.getByLabel("Enlace", { exact: true }).fill("https://youtu.be/dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Guardar en la biblioteca" }).click();
    await expect(
      page.getByText("Sin conexión. Los videos de YouTube necesitan internet.", { exact: true }),
    ).toBeVisible();
  } finally {
    await instance.close();
  }
});
