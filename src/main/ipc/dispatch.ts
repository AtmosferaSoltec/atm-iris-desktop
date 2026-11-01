import type { z } from "@shared/zod";
import { AppError, parseInput, serializeError } from "@shared/errors";
import {
  contract,
  type ChannelInput,
  type ChannelName,
  type ChannelOutput,
  type IpcResult,
} from "@shared/ipc/contract";

export type IpcHandlers = {
  [K in ChannelName]: (input: ChannelInput<K>) => ChannelOutput<K> | Promise<ChannelOutput<K>>;
};

export async function dispatch<K extends ChannelName>(
  name: K,
  input: unknown,
  isTrustedSender: boolean,
  handlers: IpcHandlers,
  guard?: (name: ChannelName) => void,
): Promise<IpcResult<ChannelOutput<K>>> {
  try {
    if (!isTrustedSender) throw new AppError("VALIDATION_FAILED", "No se permite esta solicitud.");
    const parsed = parseInput<ChannelInput<K>>(
      contract[name].input as z.ZodType<ChannelInput<K>>,
      input,
    );
    guard?.(name);
    const handler = handlers[name] as (
      value: typeof parsed,
    ) => ChannelOutput<K> | Promise<ChannelOutput<K>>;
    return { ok: true, data: await handler(parsed) };
  } catch (error) {
    return { ok: false, error: serializeError(error) };
  }
}
