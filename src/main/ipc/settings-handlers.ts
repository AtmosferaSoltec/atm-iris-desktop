import type { IpcHandlers } from "./dispatch";
import type { SettingsService } from "../services/settings.service";

export function settingsHandlers(
  service: SettingsService,
  version: string,
  homePath: string,
): Pick<
  IpcHandlers,
  "settings:get" | "settings:update-church" | "settings:update-projection" | "app:info"
> {
  return {
    "settings:get": () => service.get(),
    "settings:update-church": (input) => service.updateChurch(input),
    "settings:update-projection": (input) => service.updateProjection(input),
    "app:info": () => ({ version, homePath }),
  };
}
