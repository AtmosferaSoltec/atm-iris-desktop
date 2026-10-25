// IANA zones for the church's time zone picker, grouped by region in Spanish.

export const DEFAULT_TIME_ZONE = "America/Lima";

const REGIONS: Record<string, string> = {
  America: "América",
  Europe: "Europa",
  Africa: "África",
  Asia: "Asia",
  Atlantic: "Atlántico",
  Australia: "Australia",
  Pacific: "Pacífico",
  Indian: "Índico",
  Antarctica: "Antártida",
  Arctic: "Ártico",
};

/** Regions in the order a church in Latin America most likely needs them. */
const REGION_ORDER = Object.keys(REGIONS);

export type TimeZoneEntry = { id: string; city: string; region: string };

/** "America/Argentina/Buenos_Aires" → "Argentina / Buenos Aires". */
export function timeZoneCity(id: string): string {
  return id.split("/").slice(1).join(" / ").replaceAll("_", " ") || id;
}

export function timeZoneRegion(id: string): string {
  return REGIONS[id.split("/")[0]] ?? "Otras";
}

export function listTimeZones(): TimeZoneEntry[] {
  const ids = Intl.supportedValuesOf("timeZone").filter((id) => id.includes("/"));
  return ids
    .map((id) => ({ id, city: timeZoneCity(id), region: timeZoneRegion(id) }))
    .sort((a, b) => {
      const regionA = REGION_ORDER.indexOf(a.id.split("/")[0]);
      const regionB = REGION_ORDER.indexOf(b.id.split("/")[0]);
      return (
        (regionA === -1 ? 99 : regionA) - (regionB === -1 ? 99 : regionB) ||
        a.city.localeCompare(b.city, "es")
      );
    });
}
