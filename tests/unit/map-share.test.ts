import { describe, expect, it } from "vitest";
import { demoJobs } from "@/lib/mock-data";
import { mapShareInputSchema, mapShareSearch, parseMapShareSearch, selectMapShareJobs } from "@/lib/map-share";
import { mapPreviewPath } from "@/lib/map-preview-url";

describe("map shares", () => {
  const input = mapShareInputSchema.parse({
    bounds: { north: 60, south: 40, west: -10, east: 20 },
    query: "",
    includeExpired: true,
    theme: "dark",
  });

  it("round-trips map state", () => {
    const parsed = parseMapShareSearch(new URLSearchParams(mapShareSearch(input, "2026-10-01T12:00:00.000Z")));
    expect(parsed?.input).toEqual(input);
    expect(parsed?.createdAt).toBe("2026-10-01T12:00:00.000Z");
  });

  it("versions preview images without changing the share selection", () => {
    const shareSearch = mapShareSearch(input, "2026-10-01T12:00:00.000Z");
    const previewUrl = new URL(mapPreviewPath(shareSearch), "https://example.com");
    expect(previewUrl.pathname).toBe("/api/map-preview");
    expect(previewUrl.searchParams.get("v")).toBe("2026-10-03-map-preview-v2");
    expect(parseMapShareSearch(previewUrl.searchParams)?.input).toEqual(input);
  });

  it("rejects invalid coordinates and includes all matching real job coordinates", () => {
    expect(mapShareInputSchema.safeParse({ bounds: { north: -10, south: 10, west: 0, east: 20 } }).success).toBe(false);
    const expected = demoJobs.filter((job) => job.location.latitude >= 40 && job.location.latitude <= 60 && job.location.longitude >= -10 && job.location.longitude <= 20);
    const selected = selectMapShareJobs(demoJobs, input, "2026-10-01");
    expect(selected.map((job) => job.id)).toEqual(expected.map((job) => job.id));
  });
});
