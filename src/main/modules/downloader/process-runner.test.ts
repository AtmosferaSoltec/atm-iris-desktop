import { expect, it } from "vitest";
import { runTool } from "./process-runner";

it("passes arguments literally without invoking a shell", async () => {
  const literal = "$(echo injected); & echo unwanted";
  const result = await runTool(process.execPath, ["-e", "console.log(process.argv[1])", literal], {
    cwd: process.env.IRIS_HOME!,
    signal: new AbortController().signal,
  });
  expect(result.stdout.trim()).toBe(literal);
});
it("terminates an active process when cancelled", async () => {
  const abort = new AbortController();
  const result = runTool(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    cwd: process.env.IRIS_HOME!,
    signal: abort.signal,
  });
  abort.abort();
  await expect(result).rejects.toThrow("cancelada");
});
