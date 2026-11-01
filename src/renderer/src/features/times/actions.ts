import { invoke } from "@renderer/lib/ipc";
import { queryClient } from "@renderer/lib/query-client";
import { errorMessage } from "@shared/errors";
import type { RecordExportResult } from "@shared/schemas/timing";

async function update(action: () => Promise<unknown>): Promise<{ error?: string }> {
  try {
    await action();
    await queryClient.invalidateQueries({ queryKey: ["times"] });
    await queryClient.invalidateQueries({ queryKey: ["console"] });
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export function adjustBlockDuration(
  recordId: string,
  blockId: string,
  actualSeconds: number,
): Promise<{ error?: string }> {
  return update(() => invoke("records:adjust-duration", { recordId, blockId, actualSeconds }));
}

export function changeBlockLeader(
  recordId: string,
  blockId: string,
  personId: string | null,
): Promise<{ error?: string }> {
  return update(() => invoke("records:change-leader", { recordId, blockId, personId }));
}

export function deleteRecord(id: string): Promise<{ error?: string }> {
  return update(() => invoke("records:delete", id));
}

export async function exportRecords(
  format: "xlsx" | "pdf",
  recordIds: string[],
): Promise<{ result?: RecordExportResult; error?: string }> {
  try {
    return { result: await invoke("records:export", { format, recordIds }) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export function changeBlockStart(
  recordId: string,
  blockId: string,
  startedAt: string,
): Promise<{ error?: string }> {
  return update(() => invoke("records:change-start", { recordId, blockId, startedAt }));
}
