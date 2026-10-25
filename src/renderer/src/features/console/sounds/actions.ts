import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
export async function deleteMedia(id: string): Promise<{ error?: string }> {
  try {
    await invoke("media:delete", id);
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
