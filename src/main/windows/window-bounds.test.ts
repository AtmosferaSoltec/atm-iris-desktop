import { expect, it } from "vitest";
import { visibleWindowBounds } from "./window-bounds";
it("restores valid geometry only when its title bar is reachable", () => {
  const saved = { x: 20, y: 30, width: 1440, height: 900, isMaximized: false };
  const displays = [{ x: 0, y: 0, width: 1920, height: 1080 }];
  expect(visibleWindowBounds(saved, displays)).toEqual(saved);
  expect(visibleWindowBounds({ ...saved, x: 3000 }, displays)).toBeNull();
  expect(visibleWindowBounds({ ...saved, width: -5 }, displays)).toBeNull();
  expect(visibleWindowBounds(null, displays)).toBeNull();
});
