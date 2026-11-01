import { shell } from "electron";
import type { IpcHandlers } from "./dispatch";
import type { SettingsService } from "../services/settings.service";

const ATMOSFERA_URL = "https://atmosferast.com";

export function settingsHandlers(
  service: SettingsService,
  version: string,
  homePath: string,
  options: { skipOnboarding?: boolean } = {},
): Pick<
  IpcHandlers,
  | "settings:get"
  | "settings:update-church"
  | "settings:update-projection"
  | "app:info"
  | "onboarding:get"
  | "onboarding:complete"
  | "app:open-atmosfera"
> {
  return {
    "settings:get": () => service.get(),
    "settings:update-church": (input) => service.updateChurch(input),
    "settings:update-projection": (input) => service.updateProjection(input),
    "app:info": () => ({ version, homePath }),
    // The e2e suite starts every run on a fresh home; the welcome tour would hide the console from it.
    "onboarding:get": () => options.skipOnboarding === true || service.isOnboardingDone(),
    "onboarding:complete": () => service.completeOnboarding(),
    // A fixed address: the renderer never chooses what the system browser opens.
    "app:open-atmosfera": async () => {
      await shell.openExternal(ATMOSFERA_URL);
    },
  };
}
