/** The projection typeface keys (contract §6) as CSS stacks; the web fonts come from fonts.ts. */
const FONT_STACKS: Record<string, string> = {
  system: 'system-ui, -apple-system, "Segoe UI Variable", "Segoe UI", Roboto, sans-serif',
  inter: "var(--font-projection-inter), system-ui, sans-serif",
  montserrat: "var(--font-projection-montserrat), system-ui, sans-serif",
  poppins: "var(--font-projection-poppins), system-ui, sans-serif",
  oswald: "var(--font-projection-oswald), system-ui, sans-serif",
  bebasNeue: "var(--font-projection-bebas), system-ui, sans-serif",
  playfairDisplay: "var(--font-projection-playfair), Georgia, serif",
  lora: "var(--font-projection-lora), Georgia, serif",
  merriweather: "var(--font-projection-merriweather), Georgia, serif",
};

export function fontStack(key: string): string {
  return FONT_STACKS[key] ?? FONT_STACKS.system;
}
