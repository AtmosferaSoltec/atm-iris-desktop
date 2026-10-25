import { describe, expect, it } from "vitest";
import {
  findBook,
  parsePassageId,
  parseReference,
  passageId,
  passageLabel,
} from "./bible-reference";

describe("parseReference", () => {
  it("reads what people type", () => {
    expect(parseReference("Juan 3:16")).toMatchObject({
      book: { id: "JHN" },
      chapter: 3,
      from: 16,
      to: 16,
    });
    expect(parseReference("1 Co 13:4-7")).toMatchObject({
      book: { id: "1CO" },
      chapter: 13,
      from: 4,
      to: 7,
    });
    expect(parseReference("sal 23")).toMatchObject({
      book: { id: "PSA" },
      chapter: 23,
      from: null,
    });
    expect(parseReference("génesis")).toMatchObject({ book: { id: "GEN" }, chapter: null });
    expect(parseReference("jn 3 16")).toMatchObject({ book: { id: "JHN" }, chapter: 3, from: 16 });
    expect(parseReference("1juan 4.8")).toMatchObject({ book: { id: "1JN" }, chapter: 4, from: 8 });
    expect(parseReference("Apocalipsis 22:21")).toMatchObject({ book: { id: "REV" } });
  });

  it("rejects what is not a reference or does not exist", () => {
    for (const text of ["", "hola mundo 3", "Juan 22:1", "Juan 3:18-16", "123"]) {
      expect(parseReference(text), text).toBeNull();
    }
  });

  it("finds books by name, prefix or short form", () => {
    expect(findBook("Romanos")?.id).toBe("ROM");
    expect(findBook("hch")?.id).toBe("ACT");
    expect(findBook("2 Ti")?.id).toBe("2TI");
    expect(findBook("Cantares")?.id).toBe("SNG");
  });
});

describe("passages", () => {
  it("go to the plan's id and back", () => {
    const passage = { code: "rvr1960", bookId: "JHN", chapter: 3, from: 16, to: 18 };
    expect(passageId(passage)).toBe("rvr1960:JHN.3.16-18");
    expect(parsePassageId("rvr1960:JHN.3.16-18")).toEqual(passage);
    expect(passageId({ ...passage, to: 16 })).toBe("rvr1960:JHN.3.16");
    expect(passageLabel(passage)).toBe("Juan 3:16-18");
    expect(parsePassageId("Juan 3:16")).toBeNull();
  });
});
