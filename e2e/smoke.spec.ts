import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("opens the secure Iris console", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    await expect(page).toHaveTitle("Iris");
    expect(await instance.app.evaluate(({ app }) => app.getName())).toBe("Iris");
    await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();
    const bridge = await page.evaluate(() => ({
      hasIris: typeof Reflect.get(window, "iris") === "object",
      hasRequire: "require" in window,
      hasProcess: "process" in window,
    }));
    expect(bridge).toEqual({ hasIris: true, hasRequire: false, hasProcess: false });
    expect(
      await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content"),
    ).toContain("script-src 'self';");
    const playerOrigins = await instance.app.evaluate(async ({ net }) =>
      Promise.all(
        [
          "iris-player://app/index.html",
          "iris-player://other/youtube-player.html",
          "iris-player://app/assets/%2e%2e/index.html",
        ].map(async (url) => (await net.fetch(url)).status),
      ),
    );
    expect(playerOrigins).toEqual([404, 404, 404]);
    await page.evaluate(() => {
      window.open("https://example.com");
    });
    expect(instance.app.windows()).toHaveLength(1);
    await instance.app.evaluate(({ BrowserWindow }) => {
      const event = {
        prevented: false,
        preventDefault() {
          this.prevented = true;
        },
      };
      BrowserWindow.getAllWindows()[0].webContents.emit(
        "will-navigate",
        event,
        "https://example.com",
      );
      if (!event.prevented) throw new Error("Navigation was not blocked");
    });
  } finally {
    await instance.close();
  }
});
