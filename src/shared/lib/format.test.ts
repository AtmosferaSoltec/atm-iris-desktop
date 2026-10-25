import { describe, expect, it } from "vitest";
import {
  clock,
  fileSize,
  greeting,
  longDate,
  monthYearOverline,
  overtime,
  relativeTime,
  shortWeekdayDate,
} from "./format";

const LIMA = "America/Lima";

describe("clock and overtime", () => {
  it("formats stopwatch times", () => {
    expect(clock(580)).toBe("9:40");
    expect(clock(5530)).toBe("1:32:10");
    expect(overtime(245)).toBe("+4:05");
    expect(overtime(-3)).toBe("+0:00");
  });
});

describe("dates in the church's zone", () => {
  // 03:00 UTC on Monday is still Sunday night in Lima.
  const sundayNight = new Date("2026-09-28T03:00:00Z");

  it("uses the church's calendar day", () => {
    expect(shortWeekdayDate(sundayNight, LIMA)).toBe("dom, 27 sept");
    expect(longDate(sundayNight, LIMA)).toBe("domingo, 27 de septiembre de 2026");
    expect(monthYearOverline(sundayNight, LIMA)).toBe("SEPTIEMBRE 2026");
  });

  it("greets by the church's clock", () => {
    expect(greeting(sundayNight, LIMA)).toBe("Buenas noches,");
    expect(greeting(sundayNight, "Asia/Tokyo")).toBe("Buenas tardes,"); // 12:00 there
    expect(greeting(sundayNight, "Europe/Madrid")).toBe("Buenos días,"); // 05:00 there
  });

  it("counts relative days in the zone", () => {
    const now = new Date("2026-10-01T15:00:00Z");
    expect(relativeTime("2026-09-28T15:00:00Z", LIMA, now)).toBe("hace 3 días");
    expect(relativeTime("2026-09-30T15:00:00Z", LIMA, now)).toBe("ayer");
    expect(relativeTime("2026-10-01T14:55:00Z", LIMA, now)).toBe("hace 5 minutos");
  });
});

describe("fileSize", () => {
  it("uses Spanish decimals", () => {
    expect(fileSize(2.4 * 1024 * 1024)).toBe("2,4 MB");
    expect(fileSize(5 * 1024 ** 3)).toBe("5 GB");
    expect(fileSize(512)).toBe("512 B");
  });
});
