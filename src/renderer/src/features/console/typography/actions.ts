import type { ProjectionTypography } from "@shared/domain/projection";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
export async function saveTypography(input: ProjectionTypography): Promise<{ error?: string }> {
  try {
    const settings = await invoke("settings:get", undefined);
    await invoke("settings:update-projection", { ...settings.projection, ...input } as Parameters<
      (typeof window.iris)["settings:update-projection"]
    >[0]);
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
