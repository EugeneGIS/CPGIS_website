import { describe, expect, it } from "vitest";
import { demoJobs } from "@/lib/mock-data";
import { mapShareInputSchema, mapShareSearch, parseMapShareSearch, selectMapShareJobs } from "@/lib/map-share";

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

  it("rejects invalid coordinates and includes all matching real job coordinates", () => {
    expect(mapShareInputSchema.safeParse({ bounds: { north: -10, south: 10, west: 0, east: 20 } }).success).toBe(false);
    const expected = demoJobs.filter((job) => job.location.latitude >= 40 && job.location.latitude <= 60 && job.location.longitude >= -10 && job.location.longitude <= 20);
    const selected = selectMapShareJobs(demoJobs, input, "2026-10-01");
    expect(selected.map((job) => job.id)).toEqual(expected.map((job) => job.id));
  });
});
