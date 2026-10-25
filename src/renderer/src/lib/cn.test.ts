import { expect, it } from "vitest";
import { cn } from "./cn";

it("merges conditional classes and resolves Tailwind conflicts", () => {
  expect(cn("px-4 text-sm", false, { "font-bold": true }, "px-6")).toBe("text-sm font-bold px-6");
});
