import type { ChurchSettings, ProjectionSettings, Settings } from "@shared/domain/models";
import type { SqliteDatabase } from "../../db/sqlite";
import type { SettingsRepository } from "../types";

type ChurchRow = { name: string; timezone: string; created_at: string; updated_at: string };
type ProjectionRow = {
  font_family: string;
  font_size_pt: number;
  font_bold: number;
  font_italic: number;
  uppercase: number;
  default_background_id: string | null;
};

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SqliteDatabase) {}
  initialize(timezone: string): void {
    const now = new Date().toISOString();
    this.db.transaction(() => {
      this.db
        .prepare(
          "INSERT OR IGNORE INTO church_settings(id,name,timezone,created_at,updated_at) VALUES(1,'Mi iglesia',?,?,?)",
        )
        .run(timezone, now, now);
      this.db
        .prepare(
          "INSERT OR IGNORE INTO projection_settings(id,created_at,updated_at) VALUES(1,?,?)",
        )
        .run(now, now);
    });
  }
  get(): Settings {
    const church = this.db.prepare<ChurchRow>("SELECT * FROM church_settings WHERE id=1").get();
    const projection = this.db
      .prepare<ProjectionRow>("SELECT * FROM projection_settings WHERE id=1")
      .get();
    if (!church || !projection) throw new Error("La configuración no está inicializada.");
    return {
      church: {
        name: church.name,
        timezone: church.timezone,
        createdAt: church.created_at,
        updatedAt: church.updated_at,
      },
      projection: {
        fontFamily: projection.font_family,
        fontSizePt: projection.font_size_pt,
        fontBold: Boolean(projection.font_bold),
        fontItalic: Boolean(projection.font_italic),
        uppercase: Boolean(projection.uppercase),
        defaultBackgroundId: projection.default_background_id,
      },
    };
  }
  updateChurch(input: Pick<ChurchSettings, "name" | "timezone">): ChurchSettings {
    this.db
      .prepare("UPDATE church_settings SET name=?,timezone=?,updated_at=? WHERE id=1")
      .run(input.name, input.timezone, new Date().toISOString());
    return this.get().church;
  }
  updateProjection(input: ProjectionSettings): ProjectionSettings {
    this.db
      .prepare(
        "UPDATE projection_settings SET font_family=?,font_size_pt=?,font_bold=?,font_italic=?,uppercase=?,default_background_id=?,updated_at=? WHERE id=1",
      )
      .run(
        input.fontFamily,
        input.fontSizePt,
        Number(input.fontBold),
        Number(input.fontItalic),
        Number(input.uppercase),
        input.defaultBackgroundId,
        new Date().toISOString(),
      );
    return this.get().projection;
  }
  getPreference<T>(key: string, fallback: T): T {
    const row = this.db
      .prepare<{ value: string }>("SELECT value FROM app_settings WHERE key=?")
      .get(key);
    return row ? (JSON.parse(row.value) as T) : fallback;
  }
  setPreference(key: string, value: unknown): void {
    this.db
      .prepare(
        "INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(key, JSON.stringify(value));
  }
}
