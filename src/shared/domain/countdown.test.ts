import { expect, it } from "vitest";
import { countdownReducer } from "./countdown";
it("starts, pauses, resumes, reaches zero and hides a projected countdown", () => {
  let timer = countdownReducer(null, {
    type: "start",
    seconds: 30,
    label: " Empezamos en… ",
    now: 1000,
  });
  expect(timer).toMatchObject({ seconds: 30, label: "Empezamos en…", running: true });
  timer = countdownReducer(timer, { type: "pause", now: 11000 });
  expect(timer).toMatchObject({ seconds: 20, running: false });
  timer = countdownReducer(timer, { type: "resume", now: 21000 });
  expect(timer).toMatchObject({ seconds: 20, running: true, at: 21000 });
  timer = countdownReducer(timer, { type: "pause", now: 51000 });
  expect(timer).toMatchObject({ seconds: 0, running: false });
  expect(countdownReducer(timer, { type: "resume", now: 61000 })).toBe(timer);
  expect(countdownReducer(timer, { type: "hide" })).toBeNull();
  expect(countdownReducer(null, { type: "start", seconds: 10000, now: 0 })?.seconds).toBe(5999);
});
