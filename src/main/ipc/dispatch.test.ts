import { describe, expect, it, vi } from "vitest";
import { dispatch, type IpcHandlers } from "./dispatch";
import type { IrisApi } from "@shared/ipc/contract";

// The public bridge must reject incorrect channel arguments at compile time.
function checkContractTypes(api: IrisApi): void {
  // @ts-expect-error Church names must be strings.
  void api["settings:update-church"]({ name: 123, timezone: "America/Lima" });
  // @ts-expect-error Unlisted channels cannot be called.
  void api["files:read"]("/etc/passwd");
}
void checkContractTypes;

describe("IPC dispatch", () => {
  const updateChurch = vi.fn();
  const handlers = { "settings:update-church": updateChurch } as unknown as IpcHandlers;
  it("validates before invoking business logic and returns field errors", async () => {
    const result = await dispatch(
      "settings:update-church",
      { name: "", timezone: "bad" },
      true,
      handlers,
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields: { name: "Escribe el nombre de la iglesia." } },
    });
    expect(updateChurch).not.toHaveBeenCalled();
  });
  it("rejects untrusted senders before invoking any handler", async () => {
    expect(
      await dispatch(
        "settings:update-church",
        { name: "Iglesia", timezone: "America/Lima" },
        false,
        handlers,
      ),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(updateChurch).not.toHaveBeenCalled();
  });
});
