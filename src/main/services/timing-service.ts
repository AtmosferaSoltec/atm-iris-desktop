import type { z } from "@shared/zod";
import type { Paginated } from "@shared/domain/models";
import { AppError, parseInput } from "@shared/errors";
import { createId } from "@shared/id";
import { nameKey } from "@shared/lib/text";
import {
  personNameSchema,
  recordListSchema,
  recordInputSchema,
  serviceTypeSchema,
  type ServiceRecordInput,
} from "@shared/schemas/timing";
import type { Person, ServiceRecord, ServiceType } from "@shared/domain/models";
import type { TimingRepository, SettingsRepository } from "../repositories/types";

export class TimingService {
  constructor(
    readonly repository: TimingRepository,
    private readonly settings: SettingsRepository,
  ) {}
  people(): Person[] {
    return this.repository.people();
  }
  serviceTypes(): ServiceType[] {
    return this.repository.serviceTypes();
  }
  findOrAddPerson(name: string): Person {
    const key = nameKey(parseInput(personNameSchema, name));
    return (
      this.repository.people().find((person) => nameKey(person.name) === key) ??
      this.savePerson(null, name)
    );
  }
  deletePerson(id: string): void {
    if (!this.repository.person(id))
      throw new AppError("NOT_FOUND", "No encontramos a esa persona.");
    this.repository.deletePerson(id);
  }
  deleteServiceType(id: string): void {
    if (!this.repository.serviceType(id))
      throw new AppError("NOT_FOUND", "No encontramos el servicio.");
    this.repository.deleteServiceType(id);
  }
  record(id: string): ServiceRecord {
    const record = this.repository.record(id);
    if (!record) throw new AppError("NOT_FOUND", "No encontramos el registro.");
    return record;
  }
  deleteRecord(id: string): void {
    this.record(id);
    this.repository.deleteRecord(id);
  }
  listRecords(input: z.infer<typeof recordListSchema>): Paginated<ServiceRecord> {
    const records = this.repository
      .records()
      .filter(
        (record) =>
          (!input.serviceTypeId || record.serviceTypeId === input.serviceTypeId) &&
          (!input.status || record.status === input.status) &&
          (!input.from || Date.parse(record.date) >= Date.parse(input.from)) &&
          (!input.to || Date.parse(record.date) < Date.parse(input.to)),
      );
    return {
      data: records.slice((input.page - 1) * input.limit, input.page * input.limit),
      meta: {
        page: input.page,
        limit: input.limit,
        total: records.length,
        totalPages: Math.ceil(records.length / input.limit),
      },
    };
  }
  loadTimes(): {
    records: ServiceRecord[];
    types: ServiceType[];
    people: Person[];
    timeZone: string;
    now: string;
  } {
    return {
      records: this.repository.records(),
      types: this.repository.serviceTypes(),
      people: this.repository.people(),
      timeZone: this.settings.get().church.timezone,
      now: new Date().toISOString(),
    };
  }
  savePerson(id: string | null, raw: unknown): Person {
    const name = parseInput(personNameSchema, raw);
    if (id && !this.repository.person(id))
      throw new AppError("NOT_FOUND", "No encontramos a esa persona.");
    if (
      this.repository
        .people()
        .some((person) => person.id !== id && nameKey(person.name) === nameKey(name))
    )
      throw new AppError("CONFLICT", "Ya existe una persona con ese nombre.", {
        name: "Ya existe una persona con ese nombre.",
      });
    return this.repository.savePerson(id ?? createId(), name);
  }
  saveServiceType(id: string | null, raw: unknown): ServiceType {
    const input = parseInput(serviceTypeSchema, raw);
    if (id && !this.repository.serviceType(id))
      throw new AppError("NOT_FOUND", "No encontramos el servicio.");
    if (
      this.repository
        .serviceTypes()
        .some((type) => type.id !== id && nameKey(type.name) === nameKey(input.name))
    )
      throw new AppError("CONFLICT", "Ya existe un servicio con ese nombre.", {
        name: "Ya existe un servicio con ese nombre.",
      });
    return this.repository.saveServiceType(id ?? createId(), input);
  }
  selectService(id: string | null): void {
    if (id && !this.repository.serviceType(id))
      throw new AppError("NOT_FOUND", "No encontramos el servicio.");
    this.settings.setPreference("selected_service_type_id", id);
  }
  selectedService(): string | null {
    const id = this.settings.getPreference<string | null>("selected_service_type_id", null);
    return id && this.repository.serviceType(id) ? id : null;
  }
  saveRecord(id: string, raw: unknown): ServiceRecord {
    const input = parseInput(recordInputSchema, raw);
    if (this.repository.record(id)?.status === "finished" && input.status === "inProgress")
      throw new AppError("CONFLICT", "El servicio ya finalizó.");
    const running = this.repository
      .records()
      .find((record) => record.status === "inProgress" && record.id !== id);
    if (input.status === "inProgress" && running)
      throw new AppError("CONFLICT", "Ya hay un servicio en curso.");
    const previous = this.repository.record(id);
    const runners = input.blocks.filter((block) => block.status === "running");
    if (
      (input.status === "inProgress" && runners.length !== 1) ||
      (input.status === "finished" &&
        input.blocks.some((block) => block.status === "running" || block.status === "pending"))
    )
      throw new AppError("VALIDATION_FAILED", "Revisa el estado de los bloques del servicio.");
    const currentIndex = input.blocks.findIndex((block) => block.status === "running");
    if (
      input.blocks.some(
        (block) =>
          block.status === "skipped" &&
          previous?.blocks.find((old) => old.id === block.id)?.status !== "skipped",
      ) ||
      (input.status === "inProgress" &&
        input.blocks.some((block, index) =>
          index < currentIndex
            ? block.status === "pending"
            : index > currentIndex && block.status !== "pending",
        ))
    )
      throw new AppError(
        "VALIDATION_FAILED",
        "Los bloques deben avanzar en orden, sin omitir ninguno.",
      );
    for (const block of input.blocks) {
      if (
        (block.status === "running" && !block.startedAt) ||
        (block.startedAt &&
          block.endedAt &&
          Date.parse(block.endedAt) < Date.parse(block.startedAt))
      )
        throw new AppError("VALIDATION_FAILED", "Revisa los tiempos del bloque.");
    }
    const type = input.serviceTypeId ? this.repository.serviceType(input.serviceTypeId) : null;
    const normalized: ServiceRecordInput = {
      ...input,
      serviceTypeId: type?.id ?? null,
      serviceTypeName:
        previous && previous.serviceTypeId === (type?.id ?? null)
          ? previous.serviceTypeName
          : (type?.name ?? input.serviceTypeName),
      blocks: input.blocks.map((block) => {
        const person = block.personId ? this.repository.person(block.personId) : null;
        const old = previous?.blocks.find((candidate) => candidate.id === block.id);
        return {
          ...block,
          personId: person?.id ?? null,
          personName:
            person && old?.personId === person.id
              ? old.personName
              : (person?.name ?? block.personName),
        };
      }),
    };
    return this.repository.saveRecord(id, normalized);
  }
  adjustDuration(recordId: string, blockId: string, seconds: number): ServiceRecord {
    return this.changeBlock(recordId, blockId, (block) => ({
      ...block,
      actualSeconds: seconds,
      status: "adjusted",
    }));
  }
  /**
   * The block really began at `startedAt`: it lasts until it ended, and the block before it ends
   * there. The first block also moves the service's date.
   */
  changeStart(recordId: string, blockId: string, startedAt: string): ServiceRecord {
    const record = this.repository.record(recordId);
    const index = record?.blocks.findIndex((block) => block.id === blockId) ?? -1;
    if (!record || index === -1) throw new AppError("NOT_FOUND", "No encontramos el registro.");
    if (record.status === "inProgress")
      throw new AppError(
        "CONFLICT",
        "El servicio sigue en curso. Finalízalo antes de ajustar sus tiempos.",
      );
    const block = record.blocks[index]!;
    const previous = record.blocks[index - 1];
    if (block.status === "skipped" || !block.startedAt || !block.endedAt)
      throw new AppError("VALIDATION_FAILED", "Este bloque no tiene horas guardadas.");
    const start = Date.parse(startedAt);
    const end = Date.parse(block.endedAt);
    if (start >= end)
      throw new AppError(
        "VALIDATION_FAILED",
        "La hora de inicio debe ser anterior al final del bloque.",
      );
    if ((end - start) / 1000 > 43200)
      throw new AppError(
        "VALIDATION_FAILED",
        "Revisa la hora: el bloque quedaría demasiado largo.",
      );
    const previousStart = previous?.startedAt ? Date.parse(previous.startedAt) : null;
    if (previous && previousStart !== null && start <= previousStart)
      throw new AppError(
        "VALIDATION_FAILED",
        "La hora de inicio debe ser posterior al inicio del bloque anterior.",
      );
    const blocks = record.blocks.map((candidate, position) => {
      if (position === index)
        return {
          ...candidate,
          startedAt,
          actualSeconds: Math.round((end - start) / 1000),
          status: "adjusted" as const,
        };
      if (position === index - 1 && previousStart !== null)
        return {
          ...candidate,
          endedAt: startedAt,
          actualSeconds: Math.round((start - previousStart) / 1000),
          status: "adjusted" as const,
        };
      return candidate;
    });
    return this.saveRecord(recordId, {
      ...record,
      date: index === 0 ? startedAt : record.date,
      blocks,
    });
  }
  changeLeader(recordId: string, blockId: string, personId: string | null): ServiceRecord {
    const person = personId ? this.repository.person(personId) : null;
    if (personId && !person) throw new AppError("NOT_FOUND", "No encontramos a esa persona.");
    return this.changeBlock(recordId, blockId, (block) => ({
      ...block,
      personId: person?.id ?? null,
      personName: person?.name ?? null,
    }));
  }
  /**
   * Two blocks were timed under each other's name (one ran where the other was planned): each
   * takes the other's name and planned time, and the leaders too when asked. The real times stay
   * where they happened.
   */
  swapBlocks(
    recordId: string,
    blockId: string,
    otherBlockId: string,
    swapLeaders: boolean,
  ): ServiceRecord {
    const record = this.repository.record(recordId);
    const first = record?.blocks.find((block) => block.id === blockId);
    const second = record?.blocks.find((block) => block.id === otherBlockId);
    if (!record || !first || !second || first === second)
      throw new AppError("NOT_FOUND", "No encontramos el registro.");
    if (record.status === "inProgress")
      throw new AppError(
        "CONFLICT",
        "El servicio sigue en curso. Finalízalo antes de ajustar sus tiempos.",
      );
    const takeFrom = (
      block: ServiceRecord["blocks"][number],
      other: ServiceRecord["blocks"][number],
    ): ServiceRecord["blocks"][number] => ({
      ...block,
      name: other.name,
      plannedSeconds: other.plannedSeconds,
      ...(swapLeaders ? { personId: other.personId, personName: other.personName } : {}),
    });
    return this.saveRecord(recordId, {
      ...record,
      blocks: record.blocks.map((block) =>
        block === first
          ? takeFrom(first, second)
          : block === second
            ? takeFrom(second, first)
            : block,
      ),
    });
  }
  private changeBlock(
    recordId: string,
    blockId: string,
    change: (block: ServiceRecord["blocks"][number]) => ServiceRecord["blocks"][number],
  ): ServiceRecord {
    const record = this.repository.record(recordId);
    if (!record || !record.blocks.some((block) => block.id === blockId))
      throw new AppError("NOT_FOUND", "No encontramos el registro.");
    if (record.status === "inProgress")
      throw new AppError(
        "CONFLICT",
        "El servicio sigue en curso. Finalízalo antes de ajustar sus tiempos.",
      );
    return this.saveRecord(recordId, {
      ...record,
      blocks: record.blocks.map((block) => (block.id === blockId ? change(block) : block)),
    });
  }
}
