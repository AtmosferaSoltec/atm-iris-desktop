import { describe, expect, it, vi } from "vitest";
import type { Monitor } from "@shared/domain/monitors";
import { BLACK_FRAME } from "@shared/domain/projection";
import { MonitorService } from "./monitors";
import { ProjectionManager } from "./projection-manager";

const primary: Monitor = {
  id: 1,
  label: "Principal",
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  scaleFactor: 1,
  isPrimary: true,
  isInternal: true,
};
describe("local projection", () => {
  it("falls back to preview, remembers a monitor, handles unplugging and never automatically resumes", () => {
    let monitors = [primary];
    const screen = new MonitorService({ list: () => monitors, subscribe: () => () => {} });
    const close = vi.fn();
    const remember = vi.fn();
    const allowSleep = vi.fn();
    const manager = new ProjectionManager(screen, {
      create: () => ({ close, send: vi.fn() }),
      remember,
      preventSleep: () => 7,
      allowSleep,
      statusChanged: vi.fn(),
    });
    expect(manager.start({ isPreview: false }).isPreview).toBe(true);
    manager.stop();
    expect(allowSleep).toHaveBeenCalledWith(7);
    monitors = [primary, { ...primary, id: 2, label: "TV", isPrimary: false, isInternal: false }];
    expect(manager.start({ isPreview: false }).monitor?.id).toBe(2);
    expect(remember).toHaveBeenLastCalledWith(monitors[1]);
    monitors = [primary];
    manager.reconcile();
    expect(manager.status()).toMatchObject({ running: false, lostMonitor: { id: 2 } });
    monitors = [primary, { ...primary, id: 2, isPrimary: false }];
    manager.reconcile();
    expect(manager.status().running).toBe(false);
    expect(() => manager.start({ monitorId: 999, isPreview: false })).toThrow("pantalla");
  });
  it("coalesces pending frames and retains the latest for a newly loaded window", () => {
    const callbacks: (() => void)[] = [];
    const send = vi.fn();
    const manager = new ProjectionManager(
      new MonitorService({ list: () => [primary], subscribe: () => () => {} }),
      {
        create: () => ({ close: vi.fn(), send }),
        preventSleep: () => 1,
        allowSleep: vi.fn(),
        remember: vi.fn(),
        statusChanged: vi.fn(),
        schedule: (callback) => callbacks.push(callback),
      },
    );
    manager.start({ isPreview: true });
    manager.push(BLACK_FRAME);
    const frame = {
      ...BLACK_FRAME,
      content: { kind: "text" as const, text: "Texto", footnote: null },
    };
    manager.push(frame);
    expect(callbacks).toHaveLength(1);
    callbacks[0]();
    expect(send).toHaveBeenCalledExactlyOnceWith(frame);
    expect(manager.frame()).toBe(frame);
  });
});

it("ignores an old window's late close event after starting another output", () => {
  const closed: (() => void)[] = [];
  const send = vi.fn();
  const manager = new ProjectionManager(
    new MonitorService({ list: () => [primary], subscribe: () => () => {} }),
    {
      create: (_monitor, _preview, onClosed) => {
        closed.push(onClosed);
        return { close: vi.fn(), send };
      },
      preventSleep: () => 1,
      allowSleep: vi.fn(),
      remember: vi.fn(),
      statusChanged: vi.fn(),
    },
  );
  manager.start({ isPreview: true });
  manager.start({ isPreview: true });
  closed[0]();
  expect(manager.status().running).toBe(true);
  closed[1]();
  expect(manager.status().running).toBe(false);
});
