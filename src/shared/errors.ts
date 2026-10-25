import { z } from "@shared/zod";

export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "CONFLICT",
  "FILE_MISSING",
  "FILE_TYPE_UNSUPPORTED",
  "FILE_TOO_LARGE",
  "DISK_FULL",
  "OFFLINE",
  "INTERNAL",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export const GENERIC_ERROR = "Algo salió mal. Inténtalo de nuevo.";
export type SerializedError = { code: ErrorCode; message: string; fields?: Record<string, string> };

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function validationError(error: z.ZodError): AppError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join(".")] ??= issue.message;
  return new AppError("VALIDATION_FAILED", "Revisa los campos e inténtalo de nuevo.", fields);
}

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof z.ZodError) return serializeError(validationError(error));
  if (error instanceof AppError)
    return {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    };
  return { code: "INTERNAL", message: GENERIC_ERROR };
}

export function errorMessage(error: unknown): string {
  return error instanceof AppError ? error.message : GENERIC_ERROR;
}

export function toFormErrors<F extends string>(
  error: unknown,
  fieldNames: readonly F[],
): { message?: string; fields: Partial<Record<F, string>> } {
  const fields: Partial<Record<F, string>> = {};
  let hasUnmatched = false;
  if (error instanceof AppError) {
    for (const [key, message] of Object.entries(error.fields ?? {})) {
      const field = fieldNames.find((name) => name === key);
      if (field) fields[field] = message;
      else hasUnmatched = true;
    }
  }
  return {
    fields,
    message: Object.keys(fields).length > 0 && !hasUnmatched ? undefined : errorMessage(error),
  };
}
