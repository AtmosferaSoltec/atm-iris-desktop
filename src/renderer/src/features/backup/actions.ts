import { invoke } from "@renderer/lib/ipc";
import { queryClient } from "@renderer/lib/query-client";
import { errorMessage } from "@shared/errors";
import type { z } from "@shared/zod";
import type { eraseSchema, EraseResult, ImportResult } from "@shared/schemas/backup";

export async function exportBackup(): Promise<{ error?: string }> {
  try {
    await invoke("backup:export", undefined);
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function importBackup(): Promise<{ result?: ImportResult; error?: string }> {
  try {
    const result = await invoke("backup:import", undefined);
    await queryClient.invalidateQueries();
    return result ? { result } : {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function eraseContent(
  input: Omit<z.infer<typeof eraseSchema>, "confirm"> & { confirm: string },
): Promise<{ result?: EraseResult; error?: string }> {
  try {
    const result = await invoke("backup:erase", input as z.infer<typeof eraseSchema>);
    await queryClient.invalidateQueries();
    return { result };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
