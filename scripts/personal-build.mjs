import { spawn } from "node:child_process";

const target = process.argv[2];
if (!["win", "mac", "dev"].includes(target))
  throw new Error("Elige win, mac o dev para la edición personal.");
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("Ejecuta este comando mediante pnpm.");
const environment = { ...process.env, IRIS_PERSONAL_BUILD: "1" };
delete environment.ELECTRON_RUN_AS_NODE;
/** @param {string[]} args @returns {Promise<void>} */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Node executes this entrypoint as JavaScript.
async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pnpm, ...args], {
      env: environment,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`El comando terminó con código ${code}.`)),
    );
  });
}
if (target === "dev") await run(["dev"]);
else {
  await run(["build"]);
  await run([
    "exec",
    "electron-builder",
    `--${target}`,
    "--config",
    "electron-builder.personal.yml",
    ...process.argv.slice(3),
  ]);
}
