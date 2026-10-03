// Change only when preview rendering changes; deploys should not invalidate warm images.
const PREVIEW_VERSION = "2026-10-03-map-preview-v3";

export function mapPreviewPath(shareSearch: string) {
  const search = new URLSearchParams(shareSearch);
  search.set("v", PREVIEW_VERSION);
  return `/api/map-preview?${search.toString()}`;
}
