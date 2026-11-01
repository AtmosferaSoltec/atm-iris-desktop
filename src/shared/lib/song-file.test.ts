import { expect, it } from "vitest";
import { parseSongFile } from "./song-file";

const json = JSON.stringify([
  {
    title: "A ti me rindo",
    artist: "Hillsong",
    author: "",
    lyrics: {
      full_text: "ignored",
      paragraphs: [
        { number: 1, text: "ANTE TI POSTRADO \nESTOY AQUÍ", text_with_comment: null },
        { number: 2, text: " ", text_with_comment: "//CORO\n " },
        {
          number: 3,
          text: "A TI ME RINDO\nA TI ME RINDO",
          text_with_comment: "//CORO X2\nA TI ME RINDO\nA TI ME RINDO",
        },
      ],
    },
  },
  { title: "Solo texto", artist: "", author: "Alguien", lyrics: { full_text: "Uno\nDos\n\nTres" } },
]);

it("reads the slides and labels of a Holyrics JSON export", () => {
  const [first, second] = parseSongFile(json);
  expect(first).toEqual({
    title: "A ti me rindo",
    author: "Hillsong",
    sections: [
      { label: null, text: "ANTE TI POSTRADO\nESTOY AQUÍ" },
      { label: "CORO X2", text: "A TI ME RINDO\nA TI ME RINDO" },
    ],
  });
  expect(second).toEqual({
    title: "Solo texto",
    author: "Alguien",
    sections: [
      { label: null, text: "Uno\nDos" },
      { label: null, text: "Tres" },
    ],
  });
});

it("rejects files that are not Holyrics exports", () => {
  expect(() => parseSongFile("hola mundo")).toThrow();
  expect(() => parseSongFile("[1, 2]")).toThrow();
  expect(() => parseSongFile("Título: A ti me rindo\n\nLetra")).toThrow();
  expect(() => parseSongFile("{roto")).toThrow();
});
