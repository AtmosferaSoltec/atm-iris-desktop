import { describe, expect, it } from "vitest";
import type { ServiceType } from "@shared/domain/models";
import {
  clockState,
  finish,
  insertBlock,
  recordInput,
  resumeTimer,
  skipNext,
  startNext,
  timerFor,
  totals,
} from "./block-timer";

const culto: ServiceType = {
  id: "culto",
  name: "Culto general",
  schedule: null,
  blocks: [
    { id: "t1", name: "Bienvenida", plannedMinutes: 10 },
    { id: "t2", name: "Alabanzas", plannedMinutes: 20 },
    { id: "t3", name: "Prédica", plannedMinutes: 40 },
  ],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

let sequence = 0;
const newId = (): string => `id-${++sequence}`;
const T0 = Date.parse("2026-10-19T15:00:00.000Z");
const ana = { id: "p-ana", name: "Ana" };
const minutes = (value: number): number => value * 60_000;

describe("block timer", () => {
  it("warns at 90 percent and marks the planned boundary as over", () => {
    expect(clockState(539, 600)).toBe("normal");
    expect(clockState(540, 600)).toBe("warning");
    expect(clockState(600, 600)).toBe("over");
    expect(clockState(601, 600)).toBe("over");
  });

  it("saves in progress from the first block, then finished with the unreached blocks skipped", () => {
    let timer = timerFor(culto, newId);
    expect(recordInput(timer)).toBeNull();

    timer = startNext(timer, ana, T0);
    const running = recordInput(timer)!;
    expect(running.status).toBe("inProgress");
    expect(running.date).toBe("2026-10-19T15:00:00.000Z");
    expect(running.blocks.map((block) => block.status)).toEqual(["running", "pending", "pending"]);
    expect(running.blocks[0]).toMatchObject({ personId: "p-ana", personName: "Ana" });

    timer = startNext(timer, { id: null, name: null }, T0 + minutes(9));
    timer = finish(timer, T0 + minutes(32));
    const done = recordInput(timer)!;
    expect(done.status).toBe("finished");
    expect(done.blocks.map((block) => [block.status, block.actualSeconds])).toEqual([
      ["completed", 540],
      ["completed", 1380],
      ["skipped", 0],
    ]);
    expect(totals(timer, T0 + minutes(40))).toEqual({ actual: 1920, planned: 1800, overtime: 120 });
  });

  it("adds a block for this service only, after the running one, and times it like the rest", () => {
    let timer = startNext(timerFor(culto, newId), ana, T0);
    timer = startNext(timer, ana, T0 + minutes(10));
    // Asked to go before the running block: it lands right after it.
    timer = insertBlock(timer, { name: "Santa cena", plannedSeconds: 900 }, 0, newId);
    expect(timer.blocks.map((block) => block.name)).toEqual([
      "Bienvenida",
      "Alabanzas",
      "Santa cena",
      "Prédica",
    ]);
    expect(timer.current).toBe(1);
    expect(culto.blocks).toHaveLength(3);

    timer = startNext(timer, ana, T0 + minutes(30));
    expect(timer.blocks[timer.current!].name).toBe("Santa cena");
    timer = finish(timer, T0 + minutes(45));
    const saved = recordInput(timer)!;
    expect(saved.blocks.map((block) => [block.name, block.status, block.actualSeconds])).toEqual([
      ["Bienvenida", "completed", 600],
      ["Alabanzas", "completed", 1200],
      ["Santa cena", "completed", 900],
      ["Prédica", "skipped", 0],
    ]);
    expect(insertBlock(timer, { name: "Tarde", plannedSeconds: 60 }, 4, newId)).toBe(timer);
  });

  it("adds a block anywhere before the service starts, and at the end past the last one", () => {
    let timer = timerFor(culto, newId);
    timer = insertBlock(timer, { name: "Oración", plannedSeconds: 300 }, 0, newId);
    timer = insertBlock(timer, { name: "Avisos", plannedSeconds: 300 }, 99, newId);
    expect(timer.blocks.map((block) => block.name)).toEqual([
      "Oración",
      "Bienvenida",
      "Alabanzas",
      "Prédica",
      "Avisos",
    ]);
  });

  it("skips the next block and goes past it", () => {
    let timer = startNext(timerFor(culto, newId), ana, T0);
    timer = skipNext(timer);
    timer = startNext(timer, ana, T0 + minutes(10));
    expect(timer.blocks[timer.current!].name).toBe("Prédica");
    expect(recordInput(timer)!.blocks[1].status).toBe("skipped");
  });

  it("resumes a saved service with the running block still counting from its start", () => {
    let timer = startNext(timerFor(culto, newId), ana, T0);
    timer = startNext(timer, ana, T0 + minutes(10));
    const input = recordInput(timer)!;
    const resumed = resumeTimer({
      id: timer.recordId,
      ...input,
      blocks: input.blocks.map((block) => ({ ...block })),
      createdAt: input.date,
      updatedAt: input.date,
    })!;
    expect(resumed.current).toBe(1);
    expect(resumed.blocks[1].startedAt).toBe(T0 + minutes(10));
    expect(resumed.blocks[0].endedAt).toBe(T0 + minutes(10));
  });
});
