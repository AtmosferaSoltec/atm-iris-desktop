import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { CODE_LENGTH, type RemoteErrorCode } from "@shared/remote/protocol";

export type PairingResult = { ok: true; token: string } | { ok: false; code: RemoteErrorCode };

type Options = {
  now?: () => number;
  newCode?: () => string;
  newToken?: () => string;
  ttlMs?: number;
  maxAttempts?: number;
};

/**
 * Who may control the console. A six-digit code is short, so it is single-use, expires, and is
 * thrown away after a few wrong tries (a million combinations against five attempts). A token
 * proves a connection that already paired; it lives only in memory, so closing Iris ends every session.
 */
export class PairingGate {
  private readonly now: () => number;
  private readonly makeCode: () => string;
  private readonly makeToken: () => string;
  private readonly ttlMs: number;
  private readonly maxAttempts: number;
  private currentCode = "";
  private expiry = 0;
  private failures = 0;
  private readonly tokens = new Set<string>();

  constructor(options: Options = {}) {
    this.now = options.now ?? Date.now;
    this.makeCode =
      options.newCode ??
      ((): string => String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0"));
    this.makeToken = options.newToken ?? ((): string => randomBytes(24).toString("base64url"));
    this.ttlMs = options.ttlMs ?? 5 * 60_000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.rotate();
  }

  /** A fresh code replaces the old one (and forgives the failed tries). */
  rotate(): void {
    this.currentCode = this.makeCode();
    this.expiry = this.now() + this.ttlMs;
    this.failures = 0;
  }

  get code(): string {
    return this.currentCode;
  }

  get expiresAt(): number {
    return this.expiry;
  }

  attempt(code: string): PairingResult {
    if (this.now() >= this.expiry) {
      this.rotate();
      return { ok: false, code: "CODE_EXPIRED" };
    }
    if (!sameText(code, this.currentCode)) {
      this.failures += 1;
      if (this.failures >= this.maxAttempts) {
        this.rotate();
        return { ok: false, code: "TOO_MANY_ATTEMPTS" };
      }
      return { ok: false, code: "WRONG_CODE" };
    }
    const token = this.makeToken();
    this.tokens.add(token);
    // Single use: the next iPad needs the next code.
    this.rotate();
    return { ok: true, token };
  }

  isValidToken(token: string): boolean {
    return this.tokens.has(token);
  }

  revokeAll(): void {
    this.tokens.clear();
  }
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
