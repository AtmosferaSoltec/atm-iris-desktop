import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "../db/test-database";
import type { SqliteDatabase } from "../db/sqlite";
import { SqliteSettingsRepository } from "../repositories/sqlite/settings-repository";
import { SettingsService } from "./settings.service";

let db: SqliteDatabase;
let repository: SqliteSettingsRepository;
let service: SettingsService;
beforeEach(() => {
  db = createTestDatabase();
  repository = new SqliteSettingsRepository(db);
  repository.initialize("America/Lima");
  service = new SettingsService(repository);
});
afterEach(() => db.close());
describe("settings repository and service", () => {
  it("initializes once, persists settings and maps SQLite flags to booleans", () => {
    expect(service.get().church).toMatchObject({ name: "Mi iglesia", timezone: "America/Lima" });
    const updated = service.updateChurch({
      name: "  Iglesia Vida Nueva  ",
      timezone: "Europe/Madrid",
    });
    expect(updated.name).toBe("Iglesia Vida Nueva");
    repository.initialize("America/Lima");
    expect(service.get().church.name).toBe("Iglesia Vida Nueva");
    const projection = {
      ...service.get().projection,
      fontBold: true,
      uppercase: true,
      fontSizePt: 200,
    };
    expect(service.updateProjection(projection)).toEqual(projection);
    repository.setPreference("monitor", { id: "one" });
    expect(repository.getPreference("monitor", null)).toEqual({ id: "one" });
    expect(repository.getPreference("missing", false)).toBe(false);
  });
  it("rejects invalid names, zones, fonts and sizes before changing data", () => {
    for (const input of [
      { name: "", timezone: "America/Lima" },
      { name: "a".repeat(121), timezone: "America/Lima" },
      { name: "Iglesia", timezone: "unknown" },
    ])
      expect(() => service.updateChurch(input)).toThrow();
    for (const input of [
      { fontSizePt: 99 },
      { fontSizePt: 251 },
      { fontSizePt: 100.5 },
      { fontFamily: "unknown" },
      { fontBold: 1 },
    ])
      expect(() => service.updateProjection({ ...service.get().projection, ...input })).toThrow();
    expect(service.get().church.name).toBe("Mi iglesia");
  });
});
