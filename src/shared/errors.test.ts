import { describe, expect, it } from "vitest";
import { AppError, errorMessage, parseInput, serializeError, toFormErrors } from "./errors";
import { churchSchema } from "./schemas/settings";

describe("AppError", () => {
  it("preserves Spanish field messages and hides unexpected details", () => {
    const error = new AppError("CONFLICT", "Ya existe.", { name: "Ese nombre ya existe." });
    expect(serializeError(error)).toEqual({
      code: "CONFLICT",
      message: "Ya existe.",
      fields: { name: "Ese nombre ya existe." },
    });
    expect(toFormErrors(error, ["name"])).toEqual({
      fields: { name: "Ese nombre ya existe." },
      message: undefined,
    });
    expect(toFormErrors(error, ["timezone"]).message).toBe("Ya existe.");
    expect(errorMessage(new Error("secret path"))).toBe("Algo salió mal. Inténtalo de nuevo.");
    expect(serializeError(new Error("secret path"))).toEqual({
      code: "INTERNAL",
      message: "Algo salió mal. Inténtalo de nuevo.",
    });
  });
  it("turns zod errors into the shared validation error", () => {
    try {
      parseInput(churchSchema, { name: "", timezone: "not/a-zone" });
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(serializeError(error)).toMatchObject({
        code: "VALIDATION_FAILED",
        fields: {
          name: "Escribe el nombre de la iglesia.",
          timezone: "Elige una zona horaria de la lista.",
        },
      });
    }
  });
});
