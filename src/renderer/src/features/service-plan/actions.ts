import { errorMessage } from "@shared/errors";
import { invoke } from "@renderer/lib/ipc";
import { queryClient } from "@renderer/lib/query-client";

export async function movePlanItem(id: string, position: number): Promise<{ error?: string }> {
  try {
    await invoke("plan:move", { id, position });
    return {};
  } catch (error) {
    void queryClient.invalidateQueries({ queryKey: ["console"] });
    return { error: errorMessage(error) };
  }
}
export async function removePlanItem(id: string): Promise<{ error?: string }> {
  try {
    await invoke("plan:remove", id);
    return {};
  } catch (error) {
    void queryClient.invalidateQueries({ queryKey: ["console"] });
    return { error: errorMessage(error) };
  }
}
export async function clearPlan(): Promise<{ error?: string }> {
  try {
    await invoke("plan:clear", undefined);
    return {};
  } catch (error) {
    void queryClient.invalidateQueries({ queryKey: ["console"] });
    return { error: errorMessage(error) };
  }
}
