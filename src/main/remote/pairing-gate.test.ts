import { describe, expect, it } from "vitest";
import { PairingGate } from "./pairing-gate";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Test helper: the inferred type is what the tests use.
function gate() {
  let time = 1_000;
  let counter = 0;
  const codes = ["111111", "222222", "333333", "444444", "555555", "666666", "777777"];
  const instance = new PairingGate({
    now: () => time,
    newCode: () => codes[counter++ % codes.length]!,
    newToken: () => `token-${counter}`,
    ttlMs: 60_000,
    maxAttempts: 3,
  });
  return { instance, advance: (ms: number) => (time += ms) };
}

describe("PairingGate", () => {
  it("accepts the right code once and issues a token", () => {
    const { instance } = gate();
    const result = instance.attempt("111111");
    expect(result.ok).toBe(true);
    if (result.ok) expect(instance.isValidToken(result.token)).toBe(true);
    // Single use: the same code no longer works, a new one is shown.
    expect(instance.code).not.toBe("111111");
    expect(instance.attempt("111111")).toEqual({ ok: false, code: "WRONG_CODE" });
  });

  it("rejects a wrong code, then replaces the code after too many tries", () => {
    const { instance } = gate();
    expect(instance.attempt("000000")).toEqual({ ok: false, code: "WRONG_CODE" });
    expect(instance.attempt("000001")).toEqual({ ok: false, code: "WRONG_CODE" });
    expect(instance.attempt("000002")).toEqual({ ok: false, code: "TOO_MANY_ATTEMPTS" });
    // The code that was being guessed is gone.
    expect(instance.attempt("111111")).toEqual({ ok: false, code: "WRONG_CODE" });
  });

  it("expires the code", () => {
    const { instance, advance } = gate();
    advance(60_000);
    expect(instance.attempt("111111")).toEqual({ ok: false, code: "CODE_EXPIRED" });
    expect(instance.code).toBe("222222");
  });

  it("forgets every token when revoked", () => {
    const { instance } = gate();
    const result = instance.attempt("111111");
    if (!result.ok) throw new Error("expected pairing");
    instance.revokeAll();
    expect(instance.isValidToken(result.token)).toBe(false);
  });
});
