/** A changed file must get a new URL so previews and projection reread its bytes. */
export function localAssetUrl(asset: { id: string; fileModifiedAt?: string | null }): string {
  const version = asset.fileModifiedAt ? Date.parse(asset.fileModifiedAt) : NaN;
  return `iris-media://asset/${asset.id}${Number.isFinite(version) ? `?v=${version}` : ""}`;
}
