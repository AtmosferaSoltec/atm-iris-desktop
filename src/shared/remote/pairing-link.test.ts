import { describe, expect, it } from "vitest";
import { pairingLink } from "./pairing-link";

describe("pairingLink", () => {
  it("carries the version, secret, port, name and every address", () => {
    const link = new URL(
      pairingLink({
        secret: "abc_DEF-123",
        port: 4711,
        computerName: "Sala principal",
        addresses: ["192.168.1.20", "10.0.0.5"],
      }),
    );
    expect(link.protocol).toBe("iris:");
    expect(link.hostname).toBe("pair");
    expect(link.searchParams.get("v")).toBe("1");
    expect(link.searchParams.get("c")).toBe("abc_DEF-123");
    expect(link.searchParams.get("p")).toBe("4711");
    expect(link.searchParams.get("n")).toBe("Sala principal");
    expect(link.searchParams.getAll("h")).toEqual(["192.168.1.20", "10.0.0.5"]);
  });
});
