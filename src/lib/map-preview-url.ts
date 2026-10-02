const FALLBACK_PREVIEW_VERSION = "2026-10-02-cpgis-logo";

export function mapPreviewPath(shareSearch: string) {
  const search = new URLSearchParams(shareSearch);
  search.set("v", process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || FALLBACK_PREVIEW_VERSION);
  return `/api/map-preview?${search.toString()}`;
}
