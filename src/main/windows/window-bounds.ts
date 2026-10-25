import { z } from "@shared/zod";
const boundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(1100).max(10000),
  height: z.number().int().min(720).max(10000),
  isMaximized: z.boolean(),
});
type Bounds = z.infer<typeof boundsSchema>;
export function visibleWindowBounds(
  raw: unknown,
  displays: { x: number; y: number; width: number; height: number }[],
): Bounds | null {
  const result = boundsSchema.safeParse(raw);
  if (!result.success) return null;
  const saved = result.data;
  // Keep the title bar reachable after monitor changes, rather than restoring a lost window.
  return displays.some(
    (area) =>
      saved.x >= area.x &&
      saved.y >= area.y &&
      saved.x + 200 <= area.x + area.width &&
      saved.y + 80 <= area.y + area.height,
  )
    ? saved
    : null;
}
