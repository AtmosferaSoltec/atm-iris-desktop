import type { ServiceRecord, ServiceType } from "@shared/domain/models";
import type { ServiceRecordInput } from "@shared/schemas/timing";

// Timing a service's blocks (IRIS_SPEC §6.9, §7.9), the same rules as the iPad's
// `BlockTimer`. Pure: time comes in as epoch ms so it can be tested.

export type TimerBlock = {
  /** The block's id in the record (new for every service). */
  id: string;
  name: string;
  plannedSeconds: number;
  personId: string | null;
  personName: string | null;
  startedAt: number | null;
  endedAt: number | null;
  isSkipped: boolean;
  /**
   * Added during this service ("Agregar bloque"): it can still be renamed, moved or removed until
   * it starts. Kept in memory only, so a service resumed after a restart treats it as any other.
   */
  isExtra: boolean;
};

export type ServiceTimer = {
  /** The record's id: the same from "Comenzar" to "Terminar", every save replaces it. */
  recordId: string;
  serviceTypeId: string | null;
  serviceTypeName: string;
  blocks: TimerBlock[];
  phase: "notStarted" | "running" | "finished";
  /** Index of the block that runs now. */
  current: number | null;
};

/** No tolerance: one second over is over (IRIS_SPEC §7.9). */
export type ClockState = "normal" | "warning" | "over";

export function clockState(elapsedSeconds: number, plannedSeconds: number): ClockState {
  const seconds = Math.floor(elapsedSeconds);
  if (seconds >= plannedSeconds && plannedSeconds > 0) return "over";
  if (plannedSeconds > 0 && seconds / plannedSeconds >= 0.9) return "warning";
  return "normal";
}

export function timerFor(type: ServiceType, newId: () => string): ServiceTimer {
  return {
    recordId: newId(),
    serviceTypeId: type.id,
    serviceTypeName: type.name,
    blocks: type.blocks.map((block) => ({
      id: newId(),
      name: block.name,
      plannedSeconds: block.plannedMinutes * 60,
      personId: null,
      personName: null,
      startedAt: null,
      endedAt: null,
      isSkipped: false,
      isExtra: false,
    })),
    phase: "notStarted",
    current: null,
  };
}

/**
 * Picks up a service saved while it ran: same blocks, leaders and clock, so the current block
 * keeps counting from when it really started. Null when there is nothing running to continue.
 */
export function resumeTimer(record: ServiceRecord): ServiceTimer | null {
  if (record.status !== "inProgress") return null;
  const current = record.blocks.findIndex((block) => block.status === "running");
  if (current === -1 || !record.blocks[current].startedAt) return null;
  return {
    recordId: record.id,
    serviceTypeId: record.serviceTypeId,
    serviceTypeName: record.serviceTypeName,
    blocks: record.blocks.map((block) => ({
      id: block.id,
      name: block.name,
      plannedSeconds: block.plannedSeconds,
      personId: block.personId,
      personName: block.personName,
      startedAt: block.startedAt ? Date.parse(block.startedAt) : null,
      endedAt: block.status === "running" || !block.endedAt ? null : Date.parse(block.endedAt),
      isSkipped: block.status === "skipped",
      isExtra: false,
    })),
    phase: "running",
    current,
  };
}

/** The block that runs next: the first one after the current that is not skipped. */
export function nextIndex(timer: ServiceTimer): number | null {
  const from = timer.current === null ? 0 : timer.current + 1;
  for (let index = from; index < timer.blocks.length; index++) {
    if (!timer.blocks[index].isSkipped) return index;
  }
  return null;
}

export function elapsedSeconds(block: TimerBlock, now: number): number {
  if (block.startedAt === null) return 0;
  return Math.max(0, ((block.endedAt ?? now) - block.startedAt) / 1000);
}

/** Closes the current block (if any) and starts the next one with its leader. */
export function startNext(
  timer: ServiceTimer,
  leader: { id: string | null; name: string | null },
  now: number,
): ServiceTimer {
  const next = nextIndex(timer);
  if (next === null) return finish(timer, now);
  const blocks = timer.blocks.map((block, index) => {
    if (index === timer.current) return { ...block, endedAt: now };
    if (index === next)
      return {
        ...block,
        startedAt: now,
        endedAt: null,
        personId: leader.id,
        personName: leader.name,
      };
    return block;
  });
  return { ...timer, blocks, phase: "running", current: next };
}

/** The block that was running before this one (the last that started), or null at the first. */
export function previousIndex(timer: ServiceTimer): number | null {
  if (timer.phase !== "running" || timer.current === null) return null;
  for (let index = timer.current - 1; index >= 0; index--) {
    const block = timer.blocks[index];
    if (block.startedAt !== null && !block.isSkipped) return index;
  }
  return null;
}

/**
 * Undoes the last "Siguiente" (pressed by mistake): the block before the current one runs again
 * and keeps counting from when it really began, so the seconds of the slip are part of it. The
 * block that had just started goes back to waiting its turn, as if it never began.
 */
export function goBack(timer: ServiceTimer): ServiceTimer {
  const previous = previousIndex(timer);
  if (previous === null || timer.current === null) return timer;
  const current = timer.current;
  return {
    ...timer,
    current: previous,
    blocks: timer.blocks.map((block, index) => {
      if (index === previous) return { ...block, endedAt: null };
      // Blocks between the two were never started: they wait too.
      if (index > previous && index <= current)
        return { ...block, startedAt: null, endedAt: null, isSkipped: false };
      return block;
    }),
  };
}

/** Skips the block that would run next (it stays in the record, without time). */
export function skipNext(timer: ServiceTimer): ServiceTimer {
  const next = nextIndex(timer);
  if (next === null) return timer;
  return {
    ...timer,
    blocks: timer.blocks.map((block, index) =>
      index === next ? { ...block, isSkipped: true } : block,
    ),
  };
}

/** A service record holds at most this many blocks (`recordInputSchema`). */
export const MAX_RECORD_BLOCKS = 60;

/** Where an extra block can go: never before the running one or one already done. */
export function firstInsertIndex(timer: ServiceTimer): number {
  return timer.current === null ? 0 : timer.current + 1;
}

/**
 * Adds a block for this service only (the service type keeps its blocks): it is timed and saved
 * in Tiempos like the others. `at` is clamped to the blocks still to come.
 */
export function insertBlock(
  timer: ServiceTimer,
  block: { name: string; plannedSeconds: number },
  at: number,
  newId: () => string,
): ServiceTimer {
  if (timer.phase === "finished" || timer.blocks.length >= MAX_RECORD_BLOCKS) return timer;
  const index = Math.min(Math.max(at, firstInsertIndex(timer)), timer.blocks.length);
  const added: TimerBlock = {
    id: newId(),
    name: block.name,
    plannedSeconds: block.plannedSeconds,
    personId: null,
    personName: null,
    startedAt: null,
    endedAt: null,
    isSkipped: false,
    isExtra: true,
  };
  return {
    ...timer,
    blocks: [...timer.blocks.slice(0, index), added, ...timer.blocks.slice(index)],
  };
}

/** An extra block that has not started yet: the only kind that can still change. */
export function isEditable(block: TimerBlock): boolean {
  return block.isExtra && block.startedAt === null && !block.isSkipped;
}

/**
 * Corrects an extra block: its name, minutes and place. `at` is its index among the other blocks
 * (as if it were taken out), clamped to the blocks still to come.
 */
export function updateBlock(
  timer: ServiceTimer,
  id: string,
  change: { name: string; plannedSeconds: number },
  at: number,
): ServiceTimer {
  const block = timer.blocks.find((candidate) => candidate.id === id);
  if (!block || !isEditable(block) || timer.phase === "finished") return timer;
  const others = timer.blocks.filter((candidate) => candidate !== block);
  const rest = { ...timer, blocks: others };
  const index = Math.min(Math.max(at, firstInsertIndex(rest)), others.length);
  return {
    ...timer,
    blocks: [...others.slice(0, index), { ...block, ...change }, ...others.slice(index)],
  };
}

/** Takes out an extra block that has not started (it was added by mistake). */
export function removeBlock(timer: ServiceTimer, id: string): ServiceTimer {
  const block = timer.blocks.find((candidate) => candidate.id === id);
  if (!block || !isEditable(block) || timer.phase === "finished") return timer;
  return { ...timer, blocks: timer.blocks.filter((candidate) => candidate !== block) };
}

/** Changes the leader of a block (a correction, not a template change). */
export function setLeader(
  timer: ServiceTimer,
  index: number,
  leader: { id: string | null; name: string | null },
): ServiceTimer {
  return {
    ...timer,
    blocks: timer.blocks.map((block, position) =>
      position === index ? { ...block, personId: leader.id, personName: leader.name } : block,
    ),
  };
}

/** Ends the service: the current block closes; blocks never reached are saved as skipped. */
export function finish(timer: ServiceTimer, now: number): ServiceTimer {
  return {
    ...timer,
    blocks: timer.blocks.map((block, index) =>
      index === timer.current
        ? { ...block, endedAt: block.endedAt ?? now }
        : block.startedAt === null
          ? { ...block, isSkipped: true }
          : block,
    ),
    phase: "finished",
    current: null,
  };
}

/** What `PUT /service-records/:id` takes (contract §14). Only times, never content. */
export function recordInput(timer: ServiceTimer): ServiceRecordInput | null {
  const first = timer.blocks.find((block) => block.startedAt !== null);
  if (!first?.startedAt) return null;
  const finished = timer.phase === "finished";
  return {
    status: finished ? "finished" : "inProgress",
    date: new Date(first.startedAt).toISOString(),
    serviceTypeId: timer.serviceTypeId,
    serviceTypeName: timer.serviceTypeName,
    blocks: timer.blocks.map((block) => {
      const status =
        block.isSkipped || (finished && block.startedAt === null)
          ? "skipped"
          : block.startedAt === null
            ? "pending"
            : block.endedAt === null
              ? "running"
              : "completed";
      return {
        id: block.id,
        name: block.name,
        plannedSeconds: block.plannedSeconds,
        actualSeconds:
          status === "completed" && block.startedAt !== null && block.endedAt !== null
            ? Math.round((block.endedAt - block.startedAt) / 1000)
            : 0,
        personId: block.personId,
        personName: block.personName,
        status,
        startedAt: block.startedAt === null ? null : new Date(block.startedAt).toISOString(),
        endedAt: block.endedAt === null ? null : new Date(block.endedAt).toISOString(),
      };
    }),
  };
}

/** Real against planned, over the blocks that count (skipped ones do not). */
export function totals(
  timer: ServiceTimer,
  now: number,
): { actual: number; planned: number; overtime: number } {
  const counted = timer.blocks.filter((block) => !block.isSkipped && block.startedAt !== null);
  const actual = counted.reduce((sum, block) => sum + elapsedSeconds(block, now), 0);
  const planned = counted.reduce((sum, block) => sum + block.plannedSeconds, 0);
  return {
    actual: Math.round(actual),
    planned,
    overtime: Math.max(0, Math.round(actual - planned)),
  };
}
