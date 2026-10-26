import { expect, it, vi } from "vitest";
import { UpdateService, type UpdateOptions, type UpdatePort } from "./update-service";
import { isNewerVersion } from "@shared/schemas/updates";

function fixture(
  pending: unknown = null,
  overrides: Partial<UpdateOptions> = {},
): {
  settings: Map<string, unknown>;
  port: UpdatePort;
  options: UpdateOptions;
  service: UpdateService;
} {
  const settings = new Map<string, unknown>([["updates.requiredVersion", pending]]);
  const port: UpdatePort = {
    check: vi.fn(async () => "0.5.0"),
    download: vi.fn(async (progress) => {
      progress(55);
      progress(100);
    }),
    install: vi.fn(),
  };
  const options: UpdateOptions = {
    version: "0.4.0",
    isEnabled: true,
    settings: {
      getPreference: <T>(key: string, fallback: T) =>
        (settings.has(key) ? settings.get(key) : fallback) as T,
      setPreference: (key, value) => {
        settings.set(key, value);
      },
    },
    changed: vi.fn(),
    prepareInstall: vi.fn(),
    canInstall: () => true,
    reportError: vi.fn(),
    ...overrides,
  };
  return { settings, port, options, service: new UpdateService(port, options) };
}
it("requires a stable newer version", () => {
  for (const value of [
    "0.4.0",
    "0.3.9",
    "0.5.0-beta.1",
    "bad",
    null,
    "0.05.0",
    "99999999999999999999.0.0",
  ])
    expect(isNewerVersion(value, "0.4.0")).toBe(false);
  expect(isNewerVersion("0.4.1", "0.4.0")).toBe(true);
  expect(isNewerVersion("0.10.0", "0.4.0")).toBe(true);
});
it("blocks the workspace until the mandatory update is installed and persists the requirement", async () => {
  const { service, port, options, settings } = fixture();
  expect(() => service.assertCanUse("songs:create")).toThrow("Espera");
  expect(() => service.assertCanUse("updates:status")).not.toThrow();
  const checked = await service.check();
  expect(checked).toMatchObject({
    phase: "ready",
    isRequired: true,
    nextVersion: "0.5.0",
    progress: 100,
  });
  expect(settings.get("updates.requiredVersion")).toBe("0.5.0");
  expect(() => service.assertCanUse("console:load")).toThrow("Debes actualizar");
  expect(service.install().phase).toBe("installing");
  expect(options.prepareInstall).toHaveBeenCalledOnce();
  expect(port.install).toHaveBeenCalledOnce();
});
it("allows offline startup only before a mandatory version was detected", async () => {
  const first = fixture();
  vi.mocked(first.port.check).mockRejectedValue(new Error("offline"));
  expect(await first.service.check()).toMatchObject({ phase: "offline", isRequired: false });
  expect(() => first.service.assertCanUse("console:load")).not.toThrow();
  const remembered = fixture("0.5.0");
  vi.mocked(remembered.port.check).mockRejectedValue(new Error("offline"));
  expect(await remembered.service.check()).toMatchObject({
    phase: "error",
    isRequired: true,
    nextVersion: "0.5.0",
  });
  expect(() => remembered.service.assertCanUse("plan:add")).toThrow("Debes actualizar");
});
it("never checks again or interrupts a session already admitted to the console", async () => {
  const { service, port } = fixture();
  vi.mocked(port.check).mockResolvedValue("0.4.0");
  await service.check();
  vi.mocked(port.check).mockResolvedValue("0.5.0");
  expect(await service.check()).toMatchObject({ phase: "current", isRequired: false });
  expect(port.check).toHaveBeenCalledOnce();
  expect(() => service.assertCanUse("projection:start")).not.toThrow();
  expect(() => service.install()).toThrow("todavía no está lista");
});
it("retires an installed marker and does not downgrade or skip a previously required version", async () => {
  const done = fixture("0.4.0");
  expect(done.settings.get("updates.requiredVersion")).toBeNull();
  const required = fixture("0.6.0");
  expect(await required.service.check()).toMatchObject({
    phase: "error",
    isRequired: true,
    nextVersion: "0.6.0",
  });
  expect(required.port.download).not.toHaveBeenCalled();
  vi.mocked(required.port.check).mockResolvedValue("0.6.0");
  expect((await required.service.check()).phase).toBe("ready");
});
it("keeps download failures mandatory, retries them and serializes concurrent checks", async () => {
  const { service, port, settings } = fixture();
  vi.mocked(port.download).mockRejectedValueOnce(new Error("download failed"));
  const first = service.check();
  expect(service.check()).toBe(first);
  expect((await first).phase).toBe("error");
  expect(settings.get("updates.requiredVersion")).toBe("0.5.0");
  expect((await service.check()).phase).toBe("ready");
});
it("does not install without a successful automatic backup or while projecting", async () => {
  const failed = fixture(null, {
    prepareInstall: () => {
      throw new Error("disk full");
    },
  });
  await failed.service.check();
  expect(failed.service.install().phase).toBe("error");
  expect(failed.port.install).not.toHaveBeenCalled();
  const projecting = fixture(null, { canInstall: () => false });
  await projecting.service.check();
  expect(() => projecting.service.install()).toThrow("Detén la proyección");
  expect(projecting.port.install).not.toHaveBeenCalled();
});
it("reports asynchronous installer failures without releasing the mandatory gate", async () => {
  const { service, port } = fixture();
  await service.check();
  vi.mocked(port.install).mockImplementation((failed) => failed(new Error("installer failed")));
  expect(service.install()).toMatchObject({ phase: "error", isRequired: true });
  expect(() => service.assertCanUse("songs:create")).toThrow("Debes actualizar");
});
it("bounds startup checks and ignores their late result for the admitted offline session", async () => {
  const { service, port } = fixture(null, { timeoutMs: 5 });
  let finish!: (value: string) => void;
  vi.mocked(port.check).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  expect((await service.check()).phase).toBe("offline");
  finish("0.5.0");
  await Promise.resolve();
  expect(service.status()).toMatchObject({ phase: "offline", isRequired: false });
  expect(port.download).not.toHaveBeenCalled();
});
it("never contacts the feed when disabled in development or unsupported systems", async () => {
  const { service, port } = fixture(null, { isEnabled: false });
  expect((await service.check()).phase).toBe("disabled");
  expect(port.check).not.toHaveBeenCalled();
});
