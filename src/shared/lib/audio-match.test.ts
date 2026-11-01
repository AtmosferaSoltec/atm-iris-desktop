import { expect, it } from "vitest";
import { matchAudios } from "./audio-match";

const song = (
  id: string,
  title: string,
  author = "",
): { id: string; title: string; author: string } => ({ id, title, author });
const file = (id: string, fileName: string): { id: string; fileName: string } => ({ id, fileName });

it("matches by name ignoring case, accents, numbers and decorations", () => {
  const result = matchAudios(
    [song("a", "Bendito Jesús"), song("b", "Es por tu gracia")],
    [file("1", "01 - BENDITO JESUS (Official Audio).mp3"), file("2", "es_por_tu_gracia.mp3")],
  );
  expect(result).toEqual([
    { songId: "a", fileId: "1" },
    { songId: "b", fileId: "2" },
  ]);
});

it("uses the author to tell apart songs with the same title", () => {
  const result = matchAudios(
    [song("a", "Hay Libertad", "Art Aguilera"), song("b", "Hay Libertad", "La Ibi")],
    [file("1", "Hay Libertad - La Ibi.mp3"), file("2", "Art Aguilera - Hay Libertad.mp3")],
  );
  expect(result).toContainEqual({ songId: "b", fileId: "1" });
  expect(result).toContainEqual({ songId: "a", fileId: "2" });
});

it("leaves doubtful files alone instead of guessing", () => {
  // Two songs, one file with the shared title: nobody gets it.
  expect(
    matchAudios(
      [song("a", "Hay Libertad", "Art Aguilera"), song("b", "Hay Libertad", "La Ibi")],
      [file("1", "Hay Libertad.mp3")],
    ),
  ).toEqual([]);
  // A short title is not found inside a long unrelated name.
  expect(
    matchAudios([song("a", "Gracias")], [file("1", "Gracias por tu amor eterno.mp3")]),
  ).toEqual([]);
  // A file that fits no song.
  expect(matchAudios([song("a", "Hosanna")], [file("1", "Otra cosa.mp3")])).toEqual([]);
});

it("accepts a long title inside a longer file name", () => {
  expect(
    matchAudios(
      [song("a", "Cuan Bello Es El Señor")],
      [file("1", "Marcos Witt - Cuan bello es el Señor.mp3")],
    ),
  ).toEqual([{ songId: "a", fileId: "1" }]);
});
