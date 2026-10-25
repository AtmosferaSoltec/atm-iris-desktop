// The typefaces for projected lyrics (contract §6), by key. Except `system`, they are free
// web fonts the site carries itself (src/features/projection/fonts.ts), so the lyrics look
// the same on the console, a TV and the iPad. The API has the same keys.

export const PROJECTION_FONTS = [
  { key: "system", label: "Sistema", note: "La fuente del equipo" },
  { key: "inter", label: "Inter", note: "Moderna y muy legible" },
  { key: "montserrat", label: "Montserrat", note: "Geométrica" },
  { key: "poppins", label: "Poppins", note: "Redondeada" },
  { key: "oswald", label: "Oswald", note: "Angosta: entra más texto" },
  { key: "bebasNeue", label: "Bebas Neue", note: "Títulos, en mayúsculas" },
  { key: "playfairDisplay", label: "Playfair Display", note: "Serif elegante" },
  { key: "lora", label: "Lora", note: "Serif para leer" },
  { key: "merriweather", label: "Merriweather", note: "Serif robusta" },
] as const;

export type ProjectionFontKey = (typeof PROJECTION_FONTS)[number]["key"];

export const PROJECTION_FONT_KEYS = PROJECTION_FONTS.map((font) => font.key) as [
  ProjectionFontKey,
  ...ProjectionFontKey[],
];

export const PROJECTION_FONT_SIZE = { min: 100, max: 250, default: 100 } as const;
