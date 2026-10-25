import { expect, it } from "vitest";
import { SOUND_ICON_KEYS, soundEntry } from "./sounds";
it("maps user sounds with a stable fallback among fourteen icons", () => {
  expect(SOUND_ICON_KEYS).toHaveLength(14);
  expect(soundEntry({ id: "one", title: "Aplausos", soundIcon: "applause" })).toEqual({
    id: "one",
    title: "Aplausos",
    icon: "applause",
  });
  expect(soundEntry({ id: "two", title: "Sonido", soundIcon: "unknown" }).icon).toBe("volume");
});
