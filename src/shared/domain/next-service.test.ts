import { describe, expect, it } from "vitest";
import type { ServiceType } from "./models";
import { nextOccurrence, nextService } from "./next-service";

const LIMA = "America/Lima";

function type(name: string, schedule: ServiceType["schedule"]): ServiceType {
  return {
    id: name,
    name,
    schedule,
    blocks: [],
    createdAt: "",
    updatedAt: "",
  };
}

const culto = type("Culto", { weekday: 1, hour: 10, minute: 0 });
const jovenes = type("Jóvenes", { weekday: 7, hour: 19, minute: 0 });
const sinHorario = type("Sin horario", null);

describe("nextService", () => {
  it("picks the scheduled type that starts soonest", () => {
    // Monday 5 Oct 2026, 12:00 in Lima.
    const next = nextService([culto, jovenes], new Date("2026-10-05T17:00:00Z"), LIMA);
    expect(next?.type.name).toBe("Jóvenes");
    expect(next?.startsAt).toEqual(new Date("2026-10-11T00:00:00Z")); // Sat 19:00 Lima
    expect(next?.isToday).toBe(false);
  });

  it("keeps today's service for two hours after it starts", () => {
    // Sunday 4 Oct 2026, 11:30 in Lima: Culto started 90 minutes ago.
    const next = nextService([culto, jovenes], new Date("2026-10-04T16:30:00Z"), LIMA);
    expect(next).toMatchObject({ type: { name: "Culto" }, isToday: true });
    expect(next?.startsAt).toEqual(new Date("2026-10-04T15:00:00Z"));
  });

  it("moves on to next week once the two hours are over", () => {
    const next = nextOccurrence(culto.schedule!, new Date("2026-10-04T17:01:00Z"), LIMA);
    expect(next).toEqual(new Date("2026-10-11T15:00:00Z"));
  });

  it("uses the church's zone, not UTC", () => {
    // 02:00 UTC Monday is still Sunday 21:00 in Lima; Jóvenes is six days away, not five.
    const next = nextService([jovenes], new Date("2026-10-05T02:00:00Z"), LIMA);
    expect(next?.startsAt).toEqual(new Date("2026-10-11T00:00:00Z"));
  });

  it("falls back to the first type without schedules, and to null without types", () => {
    expect(nextService([sinHorario], new Date(), LIMA)).toMatchObject({
      type: { name: "Sin horario" },
      startsAt: null,
      isToday: false,
    });
    expect(nextService([], new Date(), LIMA)).toBeNull();
  });
});
