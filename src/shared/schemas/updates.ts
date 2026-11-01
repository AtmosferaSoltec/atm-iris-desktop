import { z } from "@shared/zod";

export const updateStatusSchema = z.object({
  phase: z.enum([
    "disabled",
    "checking",
    "current",
    "offline",
    "downloading",
    "ready",
    "installing",
    "error",
  ]),
  currentVersion: z.string(),
  nextVersion: z.string().nullable(),
  isRequired: z.boolean(),
  progress: z.number().min(0).max(100),
  message: z.string().nullable(),
});
export type UpdateStatus = z.infer<typeof updateStatusSchema>;

/** Delivery uses stable numeric versions; reject malformed or prerelease mandatory markers. */
export function isNewerVersion(candidate: unknown, current: string): candidate is string {
  const version = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  if (typeof candidate !== "string" || !version.test(candidate) || !version.test(current))
    return false;
  const next = candidate.split(".").map(Number);
  const previous = current.split(".").map(Number);
  if (![...next, ...previous].every(Number.isSafeInteger)) return false;
  for (let index = 0; index < 3; index++) {
    if (next[index] !== previous[index]) return next[index]! > previous[index]!;
  }
  return false;
}
