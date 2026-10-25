import type { Monitor } from "@shared/domain/monitors";
export interface ScreenPort {
  list(): Monitor[];
  subscribe(listener: () => void): () => void;
}
export class MonitorService {
  constructor(private readonly screen: ScreenPort) {}
  list(): Monitor[] {
    return this.screen.list();
  }
  subscribe(listener: () => void): () => void {
    return this.screen.subscribe(listener);
  }
}
