// Writes latest.json: what the download page reads (version and the files to offer).
// Usage: node scripts/release-manifest.mjs <folder with the release files>
// The updater itself reads latest.yml / latest-mac.yml, which electron-builder generates.
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const folder = process.argv[2];
if (!folder) throw new Error("Falta la carpeta con los archivos de la versión.");
const { version } = JSON.parse(await readFile("package.json", "utf8"));

const names = await readdir(folder);
/** @param {RegExp} pattern */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Node executes this entrypoint as JavaScript.
async function describe(pattern) {
  const matches = names.filter((name) => pattern.test(name));
  if (matches.length !== 1)
    throw new Error(`Se esperaba un archivo para ${pattern} y hay ${matches.length}.`);
  const file = matches[0];
  const bytes = await readFile(join(folder, file));
  return {
    file,
    sizeBytes: (await stat(join(folder, file))).size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const manifest = {
  version,
  releasedAt: new Date().toISOString(),
  windows: { x64: await describe(new RegExp(`^Iris-${version}-win-x64-setup\\.exe$`)) },
};
// macOS is optional: until the Apple secrets exist, a release ships Windows only.
if (names.some((name) => name.endsWith(".dmg"))) {
  manifest.mac = {
    arm64: await describe(new RegExp(`^Iris-${version}-mac-arm64\\.dmg$`)),
    x64: await describe(new RegExp(`^Iris-${version}-mac-x64\\.dmg$`)),
  };
}
await writeFile(join(folder, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`latest.json para la versión ${version}`);
