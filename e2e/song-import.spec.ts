import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launchApp } from "./helpers";

const exported = [
  {
    title: "A ti me rindo",
    artist: "Hillsong",
    author: "",
    lyrics: {
      paragraphs: [
        { text: "ANTE TI POSTRADO\nESTOY AQUÍ", text_with_comment: null },
        { text: "A TI ME RINDO\nA TI ME RINDO", text_with_comment: "//CORO\nA TI ME RINDO" },
      ],
    },
  },
  {
    title: "Sin letra",
    artist: "",
    author: "",
    lyrics: { paragraphs: [] },
  },
];

test("previews a Holyrics export and imports only the new songs", async () => {
  const instance = await launchApp();
  try {
    const path = join(instance.home, "holyrics.json");
    await writeFile(path, JSON.stringify(exported), "utf8");
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, path);
    const page = await instance.app.firstWindow();
    await page.getByRole("link", { name: "Configuración" }).click();
    await page.getByRole("button", { name: "Importar canciones" }).click();
    const dialog = page.getByRole("dialog", { name: "Importar canciones" });
    await expect(dialog.getByText("A ti me rindo")).toBeVisible();
    await expect(dialog.getByText("No tiene letra.")).toBeVisible();
    await dialog.getByRole("button", { name: "Importar 1 canción" }).click();
    await expect(
      page.getByText("Se importaron 1 canción; 1 no se pudieron importar"),
    ).toBeVisible();

    const list = await page.evaluate(() =>
      window.iris["songs:list"]({ page: 1, limit: 20, sort: "title", search: "", archived: false }),
    );
    if (!list.ok) throw new Error(list.error.message);
    expect(list.data.data.map((song) => song.title)).toEqual(["A ti me rindo"]);
    const [summary] = list.data.data;
    const song = await page.evaluate((id) => window.iris["songs:get"](id), summary!.id);
    if (!song.ok) throw new Error(song.error.message);
    expect(song.data.sections.map((section) => section.label)).toEqual([null, "CORO"]);
  } finally {
    await instance.close();
  }
});

test("imports a whole folder of song files in one go", async () => {
  const instance = await launchApp();
  try {
    const folder = join(instance.home, "canciones");
    await mkdir(folder);
    for (const title of ["Uno", "Dos", "Tres"])
      await writeFile(
        join(folder, `${title}.json`),
        JSON.stringify([
          {
            title,
            artist: "",
            author: "",
            lyrics: { paragraphs: [{ text: `Letra de ${title}` }] },
          },
        ]),
        "utf8",
      );
    await writeFile(join(folder, "notas.txt"), "no es una canción", "utf8");
    await instance.app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
    }, folder);
    const page = await instance.app.firstWindow();
    await page.getByRole("link", { name: "Configuración" }).click();
    await page.getByRole("button", { name: "Importar carpeta" }).click();
    const dialog = page.getByRole("dialog", { name: "Importar canciones" });
    await expect(dialog.getByText("canciones · 3 canciones nuevas")).toBeVisible();
    await dialog.getByRole("button", { name: "Importar 3 canciones" }).click();
    await expect(page.getByText("Se importaron 3 canciones")).toBeVisible();
  } finally {
    await instance.close();
  }
});
