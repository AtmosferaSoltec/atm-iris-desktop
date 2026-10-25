import { expect, it } from "vitest";
import { plannedSeconds, spectrumColor, tracksTime } from "./rules";

it("sums planned minutes in seconds and distinguishes projection-only services", () => {
  const blocks = [
    { id: "one", name: "Bienvenida", plannedMinutes: 10 },
    { id: "two", name: "Alabanzas", plannedMinutes: 15 },
  ];
  expect(plannedSeconds(blocks)).toBe(1500);
  expect(plannedSeconds([])).toBe(0);
  const service = {
    id: "service",
    name: "Culto general",
    schedule: null,
    blocks,
    createdAt: "",
    updatedAt: "",
  };
  expect(tracksTime(service)).toBe(true);
  expect(tracksTime({ ...service, blocks: [] })).toBe(false);
  expect(spectrumColor(0)).toBe(spectrumColor(5));
});
