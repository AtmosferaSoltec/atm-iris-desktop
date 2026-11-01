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
    { songId: "a", fileId: "1", isSure: true },
    { songId: "b", fileId: "2", isSure: true },
  ]);
});

it("uses the author to tell apart songs with the same title", () => {
  const result = matchAudios(
    [song("a", "Hay Libertad", "Art Aguilera"), song("b", "Hay Libertad", "La Ibi")],
    [file("1", "Hay Libertad - La Ibi.mp3"), file("2", "Art Aguilera - Hay Libertad.mp3")],
  );
  expect(result).toContainEqual({ songId: "b", fileId: "1", isSure: true });
  expect(result).toContainEqual({ songId: "a", fileId: "2", isSure: true });
});

it("leaves doubtful files alone instead of guessing", () => {
  // Two songs, one file with the shared title: nobody gets it.
  expect(
    matchAudios(
      [song("a", "Hay Libertad", "Art Aguilera"), song("b", "Hay Libertad", "La Ibi")],
      [file("1", "Hay Libertad.mp3")],
    ),
  ).toEqual([]);
  // A short title that is only the beginning of a longer name is a suggestion to review.
  expect(
    matchAudios([song("a", "Gracias")], [file("1", "Gracias por tu amor eterno.mp3")]),
  ).toEqual([{ songId: "a", fileId: "1", isSure: false }]);
  // …but it is not found in the middle of an unrelated name.
  expect(matchAudios([song("a", "Gracias")], [file("1", "Muchas gracias a ti.mp3")])).toEqual([]);
  // A file that fits no song.
  expect(matchAudios([song("a", "Hosanna")], [file("1", "Otra cosa.mp3")])).toEqual([]);
});

it("accepts a long title inside a longer file name", () => {
  expect(
    matchAudios(
      [song("a", "Cuan Bello Es El Señor")],
      [file("1", "Marcos Witt - Cuan bello es el Señor.mp3")],
    ),
  ).toEqual([{ songId: "a", fileId: "1", isSure: true }]);
});

it("suggests, for review, a name that adds the artist to a one-word title", () => {
  expect(matchAudios([song("a", "Océanos")], [file("1", "Océanos Hillsong.mp3")])).toEqual([
    { songId: "a", fileId: "1", isSure: false },
  ]);
});
