import type { PlanItemKind, ServicePlanItem } from "@shared/domain/models";
import { createId } from "@shared/id";
import { AppError } from "@shared/errors";
import type { SqliteDatabase, SqlRow } from "../../db/sqlite";
import type { PlanRepository } from "../types";

type PlanRow = SqlRow & {
  id: string;
  kind: PlanItemKind;
  ref_id: string;
  position: number;
  created_at: string;
  updated_at: string;
};
export class SqlitePlanRepository implements PlanRepository {
  constructor(private readonly db: SqliteDatabase) {}
  list(): ServicePlanItem[] {
    return this.db
      .prepare<PlanRow>("SELECT * FROM service_plan_items ORDER BY position,id")
      .all()
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        refId: row.ref_id,
        position: row.position,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
  }
  add(kind: PlanItemKind, refId: string): ServicePlanItem {
    return this.db.transaction(() => {
      const now = new Date().toISOString();
      const item = {
        id: createId(),
        kind,
        refId,
        position: this.list().length,
        createdAt: now,
        updatedAt: now,
      };
      this.db
        .prepare(
          "INSERT INTO service_plan_items(id,kind,ref_id,position,created_at,updated_at) VALUES(?,?,?,?,?,?)",
        )
        .run(item.id, kind, refId, item.position, now, now);
      if (kind === "song")
        this.db
          .prepare("UPDATE songs SET last_used_at=?,archived_at=NULL,updated_at=? WHERE id=?")
          .run(now, now, refId);
      return item;
    });
  }
  private reindex(items: ServicePlanItem[]): void {
    const now = new Date().toISOString();
    for (const [position, item] of items.entries())
      this.db
        .prepare("UPDATE service_plan_items SET position=?,updated_at=? WHERE id=?")
        .run(position, now, item.id);
  }
  move(id: string, position: number): void {
    this.db.transaction(() => {
      const items = this.list();
      const from = items.findIndex((item) => item.id === id);
      if (from === -1) throw new AppError("NOT_FOUND", "No encontramos el elemento.");
      const [item] = items.splice(from, 1);
      items.splice(Math.min(position, items.length), 0, item);
      this.reindex(items);
    });
  }
  remove(id: string): void {
    this.db.transaction(() => {
      if (!this.list().some((item) => item.id === id))
        throw new AppError("NOT_FOUND", "No encontramos el elemento.");
      this.db.prepare("DELETE FROM service_plan_items WHERE id=?").run(id);
      this.reindex(this.list());
    });
  }
  clear(): void {
    this.db.prepare("DELETE FROM service_plan_items").run();
  }
}
