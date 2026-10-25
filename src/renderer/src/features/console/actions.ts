import type { ConsoleItem } from "@shared/domain/console";
import type { PlanItemKind } from "@shared/domain/models";
import { errorMessage } from "@shared/errors";
import { invoke } from "@renderer/lib/ipc";

export async function addToService(
  kind: PlanItemKind,
  refId: string,
): Promise<{ item?: ConsoleItem; error?: string }> {
  try {
    return { item: await invoke("plan:add", { kind, refId }) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function quickItem(
  kind: PlanItemKind,
  refId: string,
): Promise<{ item?: ConsoleItem; error?: string }> {
  try {
    return { item: await invoke("console:item", { kind, refId }) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function createConsoleService(input: {
  name: string;
  blocks: { name: string; plannedMinutes: number }[];
}): Promise<{ serviceType?: import("@shared/domain/models").ServiceType; error?: string }> {
  try {
    return {
      serviceType: await invoke("service-types:create", {
        ...input,
        color: "amber",
        schedule: null,
      }),
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function saveServiceRecord(
  id: string,
  input: import("@shared/schemas/timing").ServiceRecordInput,
): Promise<{ error?: string }> {
  try {
    await invoke("records:save", { id, input });
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
