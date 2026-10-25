import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIrisHome, selectIrisHome } from "./iris-home";

const temporaryDirectories: string[] = [];
function temporaryDirectory(): string {
  const root = mkdtempSync(join(tmpdir(), "iris-home-test-"));
  temporaryDirectories.push(root);
  return root;
}
afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("Iris home", () => {
  it("creates its folders and safely resolves registered relative files", () => {
    const home = createIrisHome(join(temporaryDirectory(), "Iris"));
    writeFileSync(home.resolveInside("Audio/song.mp3"), "audio");
    expect(readFileSync(join(home.audioDir, "song.mp3"), "utf8")).toBe("audio");
    for (const path of [
      "../escape",
      "Audio/../../escape",
      "/etc/passwd",
      "C:\\Windows\\win.ini",
      "\\\\server\\file",
      "Audio\\..\\escape",
      "bad\0name",
      "",
    ])
      expect(() => home.resolveInside(path)).toThrow();
  });
  it("rejects symlink escapes even when a new child does not exist yet", () => {
    const home = createIrisHome(temporaryDirectory());
    const outside = temporaryDirectory();
    symlinkSync(outside, join(home.imagesDir, "outside"), "dir");
    expect(() => home.resolveInside("Images/outside/new.png")).toThrow("dentro de la carpeta");
    symlinkSync(home.audioDir, join(home.root, "internal"), "dir");
    expect(home.resolveInside("internal/new.mp3")).toBe(join(home.audioDir, "new.mp3"));
  });
  it("uses environment, then config, then the user's home", () => {
    const root = temporaryDirectory();
    expect(selectIrisHome(undefined, root, root)).toBe(join(root, "Iris"));
    writeFileSync(join(root, "config.json"), JSON.stringify({ homeDir: join(root, "custom") }));
    expect(selectIrisHome(undefined, root, root)).toBe(join(root, "custom"));
    expect(selectIrisHome(join(root, "override"), root, root)).toBe(join(root, "override"));
    writeFileSync(join(root, "config.json"), "broken");
    expect(() => selectIrisHome(undefined, root, root)).toThrow("config.json");
    mkdirSync(join(root, "file"));
  });
});
