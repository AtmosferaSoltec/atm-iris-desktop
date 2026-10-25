import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import type { Person } from "@shared/domain/models";
export async function findOrAddPerson(name: string): Promise<{ person?: Person; error?: string }> {
  try {
    return { person: await invoke("people:find-or-add", name) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
