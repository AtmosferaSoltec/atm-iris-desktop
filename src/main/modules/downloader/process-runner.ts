import { spawn } from "node:child_process";
import { join } from "node:path";
import { AppError } from "@shared/errors";

export type ProcessOptions = { cwd: string; signal: AbortSignal; onLine?: (line: string) => void };
export type ProcessResult = { stdout: string; stderr: string };
export type ProcessRunner = (
  executable: string,
  args: string[],
  options: ProcessOptions,
) => Promise<ProcessResult>;

export const runTool: ProcessRunner = (executable, args, options) =>
  new Promise((resolve, reject) => {
    const environment: NodeJS.ProcessEnv = { ...process.env, ELECTRON_RUN_AS_NODE: "1" };
    delete environment.NODE_OPTIONS;
    delete environment.PYTHONHOME;
    delete environment.PYTHONPATH;
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: environment,
      windowsHide: true,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let pending = "";
    let hasAborted = false;
    const terminate = (): void => {
      hasAborted = true;
      if (!child.pid) return;
      if (process.platform === "win32") {
        const killer = spawn(
          join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"),
          ["/pid", String(child.pid), "/T", "/F"],
          { shell: false, windowsHide: true, stdio: "ignore" },
        );
        killer.on("error", () => child.kill());
      } else {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      }
    };
    const onChunk = (chunk: Buffer, isError: boolean): void => {
      const text = chunk.toString("utf8");
      if (isError) stderr = (stderr + text).slice(-64 * 1024);
      else stdout += text;
      if (stdout.length > 8 * 1024 * 1024) {
        terminate();
        return;
      }
      pending += text;
      if (pending.length > 64 * 1024) pending = pending.slice(-64 * 1024);
      const lines = pending.split(/[\r\n]+/);
      pending = lines.pop() ?? "";
      for (const line of lines) options.onLine?.(line);
    };
    child.stdout.on("data", (chunk: Buffer) => onChunk(chunk, false));
    child.stderr.on("data", (chunk: Buffer) => onChunk(chunk, true));
    options.signal.addEventListener("abort", terminate, { once: true });
    if (options.signal.aborted) terminate();
    child.once("error", () =>
      reject(new AppError("INTERNAL", "No pudimos iniciar la herramienta. Vuelve a prepararla.")),
    );
    child.once("close", (code) => {
      options.signal.removeEventListener("abort", terminate);
      if (pending) options.onLine?.(pending);
      if (hasAborted || options.signal.aborted)
        reject(new AppError("CONFLICT", "Descarga cancelada o límite de tiempo alcanzado."));
      else if (code !== 0) reject(new Error(stderr || "La herramienta terminó con un error."));
      else resolve({ stdout, stderr });
    });
  });
