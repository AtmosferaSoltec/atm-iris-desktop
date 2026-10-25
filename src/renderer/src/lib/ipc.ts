import { AppError } from "@shared/errors";
import type { ChannelInput, ChannelName, ChannelOutput, IpcResult } from "@shared/ipc/contract";

export async function invoke<K extends ChannelName>(
  name: K,
  input: ChannelInput<K>,
): Promise<ChannelOutput<K>> {
  const method = window.iris[name] as (
    value: ChannelInput<K>,
  ) => Promise<IpcResult<ChannelOutput<K>>>;
  const result = await method(input);
  if (!result.ok) throw new AppError(result.error.code, result.error.message, result.error.fields);
  return result.data as ChannelOutput<K>;
}
