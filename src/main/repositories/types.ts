import type { ChurchSettings, ProjectionSettings, Settings } from "@shared/domain/models";

export interface SettingsRepository {
  initialize(timezone: string): void;
  get(): Settings;
  updateChurch(input: Pick<ChurchSettings, "name" | "timezone">): ChurchSettings;
  updateProjection(input: ProjectionSettings): ProjectionSettings;
  getPreference<T>(key: string, fallback: T): T;
  setPreference(key: string, value: unknown): void;
}

export type MediaEntry = {
  asset: import("@shared/domain/models").LocalMediaAsset;
  relativePath: string;
  isImportPending: boolean;
};
export interface MediaRepository {
  isReferenced(id: string, excludingSongId?: string): boolean;
  all(): MediaEntry[];
  get(id: string): MediaEntry | null;
  insert(entry: MediaEntry): void;
  update(entry: MediaEntry): void;
  delete(id: string): void;
}

export interface SongsRepository {
  get(id: string): import("@shared/domain/models").Song | null;
  list(
    input: import("@shared/zod").z.infer<typeof import("@shared/schemas/songs").songListSchema>,
  ): import("@shared/domain/models").Paginated<import("@shared/domain/models").SongSummary>;
  save(
    id: string,
    input: import("@shared/schemas/songs").SongInput,
  ): import("@shared/domain/models").Song;
  delete(id: string): void;
  archive(id: string, isArchived: boolean): import("@shared/domain/models").Song;
  markUsed(id: string): void;
  audioOwner(audioId: string): string | null;
}

export interface PlanRepository {
  list(): import("@shared/domain/models").ServicePlanItem[];
  add(
    kind: import("@shared/domain/models").PlanItemKind,
    refId: string,
  ): import("@shared/domain/models").ServicePlanItem;
  move(id: string, position: number): void;
  remove(id: string): void;
  clear(): void;
}

export interface TimingRepository {
  people(): import("@shared/domain/models").Person[];
  person(id: string): import("@shared/domain/models").Person | null;
  savePerson(id: string, name: string): import("@shared/domain/models").Person;
  deletePerson(id: string): void;
  serviceTypes(): import("@shared/domain/models").ServiceType[];
  serviceType(id: string): import("@shared/domain/models").ServiceType | null;
  saveServiceType(
    id: string,
    input: import("@shared/schemas/timing").ServiceTypeInput,
  ): import("@shared/domain/models").ServiceType;
  deleteServiceType(id: string): void;
  records(): import("@shared/domain/models").ServiceRecord[];
  record(id: string): import("@shared/domain/models").ServiceRecord | null;
  saveRecord(
    id: string,
    input: import("@shared/schemas/timing").ServiceRecordInput,
  ): import("@shared/domain/models").ServiceRecord;
  deleteRecord(id: string): void;
}
