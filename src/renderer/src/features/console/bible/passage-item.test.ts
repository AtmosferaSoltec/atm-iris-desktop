import { expect, it } from "vitest";
import { passageItem } from "./passage-item";
import { consoleContent } from "@shared/domain/console-frame";
it("opens the whole chapter, focuses the selected range and projects the exact verse with its RVR1960 reference", () => {
  const item = passageItem(
    {
      translation: "rvr1960",
      bookId: "JHN",
      chapter: 3,
      verses: [
        { number: 15, text: "Texto 15" },
        { number: 16, text: "Texto [exacto] & sin modificar" },
        { number: 17, text: "Texto 17" },
      ],
    },
    { code: "rvr1960", bookId: "JHN", chapter: 3, from: 16, to: 17 },
    { planItemId: "bible-live", refId: "rvr1960:JHN.3.16-17" },
  );
  expect(item.focus).toEqual({ first: 1, last: 2 });
  expect(item.slides).toHaveLength(3);
  expect(consoleContent(item, 1, false, null, null)).toEqual({
    kind: "text",
    text: "Texto [exacto] & sin modificar",
    footnote: "Juan 3:16 · RVR1960",
  });
});
