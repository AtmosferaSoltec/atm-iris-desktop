import { beforeEach, expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import { SqliteMediaRepository } from "../repositories/sqlite/media-repository";
import { SqliteSongsRepository } from "../repositories/sqlite/songs-repository";
import { SqliteMaintenanceRepository } from "../repositories/sqlite/maintenance-repository";
import { SongImportService } from "./song-import-service";

const file = (songs: object[]): string =>
  JSON.stringify(
    songs.map((song) => ({
      author: "",
      ...song,
      lyrics: {
        paragraphs: [{ text: "Línea uno\nLínea dos", text_with_comment: null }],
      },
    })),
  );

let maintenance: SqliteMaintenanceRepository;
let service: SongImportService;
beforeEach(() => {
  const db = createTestDatabase();
  const songs = new SqliteSongsRepository(db, new SqliteMediaRepository(db));
  maintenance = new SqliteMaintenanceRepository(db, songs);
  service = new SongImportService(maintenance);
});

it("previews, then saves only the new songs and skips repeated and invalid ones", () => {
  const preview = service.preview(
    [
      {
        name: "canciones.json",
        content: file([
          { title: "Hosanna", artist: "Marcos Barrientos" },
          { title: "HOSANNA", artist: "marcos barrientos" },
          { title: "Hosanna", artist: "Hillsong" },
          { title: "", artist: "Sin título" },
        ]),
      },
    ],
    "canciones.json",
  );
  expect(preview.items.map((item) => item.status)).toEqual(["new", "duplicate", "new", "invalid"]);
  expect(maintenance.songs()).toHaveLength(0);

  expect(service.confirm({ token: preview.token })).toEqual({
    imported: 2,
    duplicates: 1,
    invalid: 1,
  });
  expect(
    maintenance
      .songs()
      .map((song) => song.title)
      .sort(),
  ).toEqual(["Hosanna", "Hosanna"]);

  const again = service.preview(
    [{ name: "otra.json", content: file([{ title: "Hosanna", artist: "Hillsong" }]) }],
    "otra.json",
  );
  expect(again.items[0]!.status).toBe("duplicate");
});

it("refuses a stale preview and a file that is not from Holyrics", () => {
  const preview = service.preview(
    [{ name: "a.json", content: file([{ title: "Uno", artist: "" }]) }],
    "a.json",
  );
  service.preview([{ name: "b.json", content: file([{ title: "Dos", artist: "" }]) }], "b.json");
  expect(() => service.confirm({ token: preview.token })).toThrow(/venció/);
  expect(() => service.preview([{ name: "x.txt", content: "hola" }], "x.txt")).toThrow(
    /archivo de canciones/,
  );
});

it("previews many files at once, repeats across files count once and bad files become problem rows", () => {
  const preview = service.preview(
    [
      { name: "uno.json", content: file([{ title: "Hosanna", artist: "Hillsong" }]) },
      {
        name: "dos.json",
        content: file([
          { title: "Hosanna", artist: "Hillsong" },
          { title: "Océanos", artist: "" },
        ]),
      },
      { name: "roto.json", content: "hola" },
    ],
    "3 archivos",
  );
  expect(preview.items.map((item) => item.status)).toEqual(["new", "duplicate", "new", "invalid"]);
  expect(preview.items[3]!.title).toBe("roto.json");
  expect(service.confirm({ token: preview.token })).toMatchObject({ imported: 2, duplicates: 1 });
});
