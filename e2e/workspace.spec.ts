import { test, expect } from "@playwright/test";
import { launchApp } from "./helpers";

test("shows thirty compact slides in four or five columns while keeping full live text and editing", async () => {
  const instance = await launchApp();
  try {
    const page = await instance.app.firstWindow();
    const texts = Array.from({ length: 30 }, (_, index) =>
      Array.from(
        { length: 6 },
        (_, line) => `Línea ${line + 1} de la diapositiva ${index + 1}`,
      ).join("\n"),
    );
    await page.evaluate(async (texts) => {
      const result = await window.iris["songs:create"]({
        title: "Canción de treinta diapositivas",
        author: "",
        sections: texts.map((text, index) => ({ label: `Estrofa ${index + 1}`, text })),
        audioId: null,
        youtubeId: null,
      });
      if (!result.ok) throw new Error(result.error.message);
    }, texts);
    await page.reload();
    await page
      .getByRole("region", { name: "Biblioteca", exact: true })
      .getByText("Canción de treinta diapositivas", { exact: true })
      .dblclick();
    const grid = page.getByRole("list", { name: "Diapositivas", exact: true });
    const cards = grid.getByRole("button", { name: /^Enviar a la pantalla:/ });
    const first = cards.first();
    await expect(cards).toHaveCount(30);
    for (const [width, height, columns] of [
      [1280, 800, 4],
      [1440, 900, 4],
      [1920, 1080, 5],
    ]) {
      await page.setViewportSize({ width, height });
      await expect
        .poll(() =>
          grid.evaluate(
            (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
          ),
        )
        .toBe(columns);
      const bounds = await first.boundingBox();
      expect(bounds!.height).toBeLessThanOrEqual(100);
      await expect(first.getByText(texts[0], { exact: true })).toHaveCSS("font-size", "14px");
      const visible = await cards.evaluateAll((buttons) => {
        const container = buttons[0].closest("ol")!.parentElement!.getBoundingClientRect();
        return buttons.filter((button) => {
          const bounds = button.getBoundingClientRect();
          return bounds.top >= container.top && bounds.bottom <= container.bottom;
        }).length;
      });
      expect(visible).toBeGreaterThanOrEqual(columns * 3);
      await page.screenshot({ path: test.info().outputPath(`workspace-${width}.png`) });
    }
    await first.click({ button: "right" });
    const editor = page.getByRole("dialog", {
      name: "Canción de treinta diapositivas · Estrofa 1",
      exact: true,
    });
    await expect(
      editor.getByRole("textbox", { name: "Texto de la diapositiva", exact: true }),
    ).toHaveValue(texts[0]);
    await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
    await first.click();
    const live = page.getByRole("region", { name: "Pantalla en vivo", exact: true });
    await expect(live.getByText(texts[0], { exact: true })).toBeVisible();
    await expect(first).toHaveAttribute("aria-current", "true");
    const frame = await page.evaluate(() => window.iris["projection:request-frame"](undefined));
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect
      .poll(() => page.evaluate(() => window.iris["projection:request-frame"](undefined)))
      .toEqual(frame);
    await cards.last().click();
    await expect(live.getByText(texts[29], { exact: true })).toBeVisible();
    await expect(cards.last()).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(live.getByText(texts[28], { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("workspace-live.png") });
    await grid.getByRole("button", { name: "Pantalla en blanco (B)", exact: true }).click();
    await expect(
      grid.getByRole("button", { name: "Pantalla en blanco (B)", exact: true }),
    ).toHaveAttribute("aria-current", "true");
  } finally {
    await instance.close();
  }
});
