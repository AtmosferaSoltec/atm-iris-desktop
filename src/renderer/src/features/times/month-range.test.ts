import { expect, it } from "vitest";
import { filterByMonths, monthOptions } from "./month-range";

const records = ["2026-09-06T15:00:00Z", "2026-10-04T15:00:00Z", "2026-12-06T15:00:00Z"].map(
  (date) => ({ date }),
);

it("lists the months that have records", () => {
  expect(monthOptions(records, "America/Lima")).toEqual([
    { value: "2026-09", label: "Septiembre 2026" },
    { value: "2026-10", label: "Octubre 2026" },
    { value: "2026-12", label: "Diciembre 2026" },
  ]);
});

it("keeps the records between two months, both included, in any order", () => {
  expect(filterByMonths(records, "2026-10", "2026-12", "America/Lima")).toHaveLength(2);
  expect(filterByMonths(records, "2026-12", "2026-10", "America/Lima")).toHaveLength(2);
  expect(filterByMonths(records, "", "2026-09", "America/Lima")).toHaveLength(1);
  expect(filterByMonths(records, "", "", "America/Lima")).toHaveLength(3);
  expect(filterByMonths(records, "basura", "", "America/Lima")).toHaveLength(3);
});
