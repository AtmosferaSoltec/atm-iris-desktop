import { expect, it } from "vitest";
import { localAssetUrl } from "./asset-url";
it("versions changed local files while preserving their asset ids", () => {
  expect(localAssetUrl({ id: "asset" })).toBe("iris-media://asset/asset");
  expect(localAssetUrl({ id: "asset", fileModifiedAt: "1970-01-01T00:00:01.000Z" })).toBe(
    "iris-media://asset/asset?v=1000",
  );
  expect(localAssetUrl({ id: "asset", fileModifiedAt: "invalid" })).toBe(
    "iris-media://asset/asset",
  );
});
