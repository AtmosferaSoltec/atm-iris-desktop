import type { Monitor, ProjectionStatus } from "@shared/domain/monitors";
import type { ProjectionFrame } from "@shared/domain/projection";
import { BLACK_FRAME } from "@shared/domain/projection";
import { AppError } from "@shared/errors";
import type { MonitorService } from "./monitors";

export interface ProjectionWindowPort {
  close: () => void;
  send: (frame: ProjectionFrame) => void;
}
export type ProjectionPorts = {
  create: (
    monitor: Monitor | null,
    isPreview: boolean,
    onClosed: () => void,
  ) => ProjectionWindowPort;
  preventSleep: () => number;
  allowSleep: (id: number) => void;
  remember: (monitor: Monitor | null) => void;
  statusChanged: (status: ProjectionStatus) => void;
  schedule?: (callback: () => void) => void;
};
export class ProjectionManager {
  private window: ProjectionWindowPort | null = null;
  private latest: ProjectionFrame = BLACK_FRAME;
  private pending = false;
  private generation = 0;
  private blocker: number | null = null;
  private current: ProjectionStatus = {
    running: false,
    monitor: null,
    isPreview: false,
    lostMonitor: null,
  };
  constructor(
    private readonly monitors: MonitorService,
    private readonly ports: ProjectionPorts,
  ) {}
  status(): ProjectionStatus {
    return this.current;
  }
  frame(): ProjectionFrame {
    return this.latest;
  }
  start(input: { monitorId?: number; isPreview: boolean }): ProjectionStatus {
    const available = this.monitors.list();
    const monitor =
      input.monitorId !== undefined
        ? available.find((candidate) => candidate.id === input.monitorId)
        : available.find((candidate) => !candidate.isPrimary);
    const isPreview = input.isPreview || (!monitor && input.monitorId === undefined);
    if (!isPreview && !monitor)
      throw new AppError("NOT_FOUND", "No encontramos esa pantalla. Revisa la conexión.");
    this.stop();
    this.current = {
      running: true,
      monitor: isPreview ? null : monitor!,
      isPreview,
      lostMonitor: null,
    };
    const generation = this.generation;
    try {
      this.window = this.ports.create(this.current.monitor, isPreview, () => {
        if (this.generation === generation) this.closed();
      });
    } catch (error) {
      this.closed();
      throw error;
    }
    this.blocker = this.ports.preventSleep();
    this.ports.remember(this.current.monitor);
    this.ports.statusChanged(this.current);
    return this.current;
  }
  private closed(): void {
    this.window = null;
    if (this.blocker !== null) {
      this.ports.allowSleep(this.blocker);
      this.blocker = null;
    }
    this.current = { ...this.current, running: false, monitor: null };
    this.ports.statusChanged(this.current);
  }
  stop(): ProjectionStatus {
    this.generation++;
    const window = this.window;
    this.window = null;
    window?.close();
    this.closed();
    return this.current;
  }
  reconcile(): void {
    const monitor = this.current.monitor;
    if (
      this.current.running &&
      monitor &&
      !this.monitors.list().some((candidate) => candidate.id === monitor.id)
    ) {
      this.stop();
      this.current = { ...this.current, lostMonitor: monitor };
      this.ports.statusChanged(this.current);
    }
  }
  push(frame: ProjectionFrame): void {
    this.latest = frame;
    if (this.pending) return;
    this.pending = true;
    (this.ports.schedule ?? queueMicrotask)(() => {
      this.pending = false;
      this.window?.send(this.latest);
    });
  }
}
