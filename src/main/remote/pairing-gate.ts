import { randomBytes, timingSafeEqual } from "node:crypto";
import type { RemoteErrorCode } from "@shared/remote/protocol";

export type PairingResult = { ok: true; token: string } | { ok: false; code: RemoteErrorCode };

type Options = {
  now?: () => number;
  newCode?: () => string;
  newToken?: () => string;
  ttlMs?: number;
  /** How long the secret just used still pairs (see `attempt`). */
  graceMs?: number;
  maxAttempts?: number;
};

/**
 * Who may control the console. The secret travels only inside the QR on the computer's screen:
 * it is single-use, expires and is thrown away after a few wrong tries. A token
 * proves a connection that already paired; it lives only in memory, so closing Iris ends every session.
 */
export class PairingGate {
  private readonly now: () => number;
  private readonly makeCode: () => string;
  private readonly makeToken: () => string;
  private readonly ttlMs: number;
  private readonly maxAttempts: number;
  private readonly graceMs: number;
  private lastUsed: { code: string; token: string; at: number } | null = null;
  private currentCode = "";
  private expiry = 0;
  private failures = 0;
  private readonly tokens = new Set<string>();

  constructor(options: Options = {}) {
    this.now = options.now ?? Date.now;
    this.makeCode = options.newCode ?? ((): string => randomBytes(16).toString("base64url"));
    this.makeToken = options.newToken ?? ((): string => randomBytes(24).toString("base64url"));
    this.ttlMs = options.ttlMs ?? 5 * 60_000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.graceMs = options.graceMs ?? 15_000;
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
    // The iPad tries every address in the QR at once, and they can all be this same computer
    // (cable, virtual adapters…): the first to arrive uses the secret up, the rest arrive a moment
    // later with the same one. They get the same session instead of a refusal.
    const used = this.lastUsed;
    if (used && this.now() - used.at < this.graceMs && sameText(code, used.code))
      return { ok: true, token: used.token };
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
    this.lastUsed = { code, token, at: this.now() };
    // Single use: the next iPad needs the next code.
    this.rotate();
    return { ok: true, token };
  }

  isValidToken(token: string): boolean {
    return this.tokens.has(token);
  }

  revokeAll(): void {
    this.tokens.clear();
    this.lastUsed = null;
  }
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
