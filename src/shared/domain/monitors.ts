export type Monitor = {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  isPrimary: boolean;
  isInternal: boolean;
};
export type ProjectionStatus = {
  running: boolean;
  monitor: Monitor | null;
  isPreview: boolean;
  lostMonitor: Monitor | null;
};
