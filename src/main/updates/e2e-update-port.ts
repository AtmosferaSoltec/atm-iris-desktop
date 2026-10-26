import type { UpdatePort } from "./update-service";

/** Activated only by the isolated Electron test profile; never contacts a release server. */
export function createE2eUpdatePort(scenario: string): UpdatePort {
  return {
    check: async () => {
      if (scenario === "offline") throw new Error("Offline fixture");
      return "999.0.0";
    },
    download: async (progress) => {
      progress(25);
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (scenario === "download-error") throw new Error("Download fixture error");
      progress(100);
    },
    install: () => {
      Reflect.set(globalThis, "irisE2eUpdateInstalled", true);
    },
  };
}
