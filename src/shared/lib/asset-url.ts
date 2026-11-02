/** A changed file must get a new URL so previews and projection reread its bytes. */
export function localAssetUrl(asset: { id: string; fileModifiedAt?: string | null }): string {
  const version = asset.fileModifiedAt ? Date.parse(asset.fileModifiedAt) : NaN;
  return `iris-media://asset/${asset.id}${Number.isFinite(version) ? `?v=${version}` : ""}`;
}

/** A still JPEG of an image or video, made by main from the file (never a path). */
export function thumbnailUrl(id: string): string {
  return `iris-media://thumb/${id}`;
}
