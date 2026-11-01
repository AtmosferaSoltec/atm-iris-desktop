import { expect, test } from "@playwright/test";
import { launchApp } from "./helpers";

test("a pasted YouTube link goes to the projection screen without being saved in the service", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await page.getByRole("button", { name: "Proyectar", exact: true }).click();
    const opened = instance.app.waitForEvent("window");
    await page.getByRole("button", { name: "Iniciar proyección", exact: true }).click();
    const projection = await opened;
    await projection.waitForLoadState();

    await page.getByRole("radio", { name: "Multimedia", exact: true }).click();
    await page.getByRole("radio", { name: "YouTube", exact: true }).click();
    const play = page.getByRole("button", { name: "Proyectar video", exact: true });
    await page.getByLabel("Enlace de YouTube").fill("esto no es un enlace");
    await expect(page.getByText("Ese enlace no es de un video de YouTube.")).toBeVisible();
    await expect(play).toBeDisabled();

    await page.getByLabel("Enlace de YouTube").fill("https://youtu.be/dQw4w9WgXcQ?si=abc");
    await expect(play).toBeEnabled();
    await play.click();

    // YouTube's player lives in its own page inside the projection screen.
    await expect(projection.locator("iframe")).toHaveAttribute(
      "src",
      "iris-player://app/youtube-player.html",
    );
    // The e2e profile has no internet: the player says so instead of staying black.
    await expect(
      projection.getByText("Sin conexión. Los videos de YouTube necesitan internet."),
    ).toBeVisible();

    // It is shown, but it is not part of the service.
    const loaded = await page.evaluate(() => window.iris["console:load"](undefined));
    if (!loaded.ok) throw new Error(loaded.error.message);
    expect(loaded.data.items).toHaveLength(0);
  } finally {
    await instance.close();
  }
});
