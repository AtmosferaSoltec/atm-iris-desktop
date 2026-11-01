import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { silentMp3 } from "./audio-fixture";
import { launchApp } from "./helpers";

test("assigns the MP3s dropped in Iris/Audio to the songs with the same name", async () => {
  const instance = await launchApp();
  try {
    await writeFile(join(instance.home, "Audio", "01 - HOSANNA.mp3"), silentMp3());
    await writeFile(join(instance.home, "Audio", "bendito jesus.mp3"), silentMp3());
    await writeFile(join(instance.home, "Audio", "suelto.mp3"), silentMp3());
    const page = await instance.app.firstWindow();
    const ids = await page.evaluate(async () => {
      const created: string[] = [];
      for (const title of ["Hosanna", "Bendito Jesús", "Sin audio"]) {
        const result = await window.iris["songs:create"]({
          title,
          author: "",
          sections: [{ label: null, text: "Letra" }],
          audioId: null,
        });
        if (!result.ok) throw new Error(result.error.message);
        created.push(result.data.song.id);
      }
      return created;
    });
    await page.getByRole("link", { name: "Configuración" }).click();
    await page.getByRole("button", { name: "Buscar coincidencias" }).click();
    const dialog = page.getByRole("dialog", { name: "Asignar audios" });
    await expect(dialog.getByText("01 - HOSANNA.mp3")).toBeVisible();
    await expect(dialog.getByText("bendito jesus.mp3")).toBeVisible();
    await dialog.getByRole("button", { name: "Asignar 2 audios" }).click();
    await expect(page.getByText("Se asignaron 2 audios")).toBeVisible();

    const audios = await page.evaluate(async (songIds) => {
      const files: (string | null)[] = [];
      for (const id of songIds) {
        const song = await window.iris["songs:get"](id);
        if (!song.ok) throw new Error(song.error.message);
        files.push(song.data.audio?.fileName ?? null);
      }
      return files;
    }, ids);
    expect(audios).toEqual(["01 - HOSANNA.mp3", "bendito jesus.mp3", null]);
  } finally {
    await instance.close();
  }
});
