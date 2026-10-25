import {
  accessSync,
  constants,
  lstatSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, win32 } from "node:path";
import { AppError } from "@shared/errors";

export type IrisHome = {
  root: string;
  audioDir: string;
  videosDir: string;
  imagesDir: string;
  backgroundsDir: string;
  soundsDir: string;
  backupsDir: string;
  databasePath: string;
  resolveInside: (relativePath: string) => string;
};

export function resolveInside(root: string, relativePath: string): string {
  if (
    !relativePath ||
    isAbsolute(relativePath) ||
    win32.isAbsolute(relativePath) ||
    relativePath.split(/[/\\]/).some((part) => part === "..") ||
    relativePath.includes("\0")
  )
    throw new AppError("VALIDATION_FAILED", "La ruta del archivo no es válida.");
  const actualRoot = realpathSync(root);
  const target = resolve(actualRoot, relativePath);
  const difference = relative(actualRoot, target);
  if (difference.startsWith("..") || isAbsolute(difference))
    throw new AppError("VALIDATION_FAILED", "El archivo debe estar dentro de la carpeta de Iris.");
  // Resolve every existing ancestor too: imports may name a file that does not exist yet.
  let ancestor = target;
  const pending: string[] = [];
  while (!lstatSync(ancestor, { throwIfNoEntry: false })) {
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new AppError("FILE_MISSING", "No encontramos el archivo.");
    pending.unshift(basename(ancestor));
    ancestor = parent;
  }
  const actualTarget = resolve(realpathSync(ancestor), ...pending);
  const actualDifference = relative(actualRoot, actualTarget);
  if (actualDifference.startsWith("..") || isAbsolute(actualDifference))
    throw new AppError("VALIDATION_FAILED", "El archivo debe estar dentro de la carpeta de Iris.");
  return actualTarget;
}

export function createIrisHome(root: string): IrisHome {
  try {
    mkdirSync(root, { recursive: true });
    root = realpathSync(root);
    accessSync(root, constants.W_OK);
    const directory = (name: string): string => {
      const path = resolveInside(root, name);
      mkdirSync(path, { recursive: true });
      if (!statSync(path).isDirectory()) throw new Error("No es una carpeta");
      return path;
    };
    return {
      root,
      audioDir: directory("Audio"),
      videosDir: directory("Videos"),
      imagesDir: directory("Images"),
      backgroundsDir: directory("Backgrounds"),
      soundsDir: directory("Sounds"),
      backupsDir: directory("Backups"),
      databasePath: (() => {
        directory("Database");
        return resolveInside(root, "Database/iris.db");
      })(),
      resolveInside: (path) => resolveInside(root, path),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INTERNAL",
      "No pudimos crear la carpeta de Iris. Revisa los permisos y el espacio disponible.",
    );
  }
}

export function selectIrisHome(
  override: string | undefined,
  userData: string,
  home: string,
): string {
  if (override) return resolve(override);
  const configPath = join(userData, "config.json");
  if (existsSync(configPath)) {
    try {
      const config: unknown = JSON.parse(readFileSync(configPath, "utf8"));
      if (
        typeof config === "object" &&
        config !== null &&
        "homeDir" in config &&
        typeof config.homeDir === "string" &&
        isAbsolute(config.homeDir)
      )
        return config.homeDir;
      throw new Error("Configuración inválida");
    } catch {
      // Falling back could silently open an empty library instead of the user's real home.
      throw new AppError(
        "INTERNAL",
        "No pudimos leer la ubicación de la carpeta de Iris. Revisa config.json.",
      );
    }
  }
  return join(home, "Iris");
}
