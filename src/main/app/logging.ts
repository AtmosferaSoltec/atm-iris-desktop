import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

let logPath: string | undefined;

export function initializeLogging(directory: string): void {
  mkdirSync(directory, { recursive: true });
  logPath = join(directory, "iris.log");
}

export function logError(error: unknown): void {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  try {
    if (!logPath) return;
    if (existsSync(logPath) && statSync(logPath).size > 1_048_576) {
      renameSync(logPath, `${logPath}.1`);
    }
    appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`, "utf8");
  } catch {
    console.error("No se pudo escribir el registro de Iris.");
  }
}
