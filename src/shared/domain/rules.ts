import type { BlockTemplate, ServiceType } from "./models";

/** Rotating colors for avatars, timelines and rows (`SPECTRUM[i % 5]`). */
export const SPECTRUM = ["#FFB547", "#FF7A59", "#F0508C", "#9B5CFF", "#4E5BFF"] as const;

export const BLOCK_MINUTES = { min: 1, max: 240, default: 10 } as const;

export function spectrumColor(index: number): string {
  return SPECTRUM[index % SPECTRUM.length];
}

export function tracksTime(type: ServiceType): boolean {
  return type.blocks.length > 0;
}

export function plannedSeconds(blocks: BlockTemplate[]): number {
  return blocks.reduce((total, block) => total + block.plannedMinutes * 60, 0);
}
