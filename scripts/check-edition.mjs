import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const isPersonal = process.env.IRIS_PERSONAL_BUILD === "1";
const bundles = {};
for (const root of ["out/main", "out/renderer"]) {
  const pending = [root];
  let source = "";
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (path.endsWith(".js")) source += readFileSync(path, "utf8");
    }
  }
  bundles[root] = source;
}
assert.equal(
  bundles["out/main"].includes("api.github.com/repos/yt-dlp/yt-dlp/releases/latest"),
  isPersonal,
  "El backend opcional debe coincidir con la edición de entrega.",
);
assert.equal(
  bundles["out/renderer"].includes("Preparar herramienta"),
  isPersonal,
  "La interfaz opcional debe quedar fuera de la edición general.",
);
console.log(
  isPersonal
    ? "Edición personal: módulo de descargas incluido."
    : "Edición general: módulo de descargas excluido.",
);
