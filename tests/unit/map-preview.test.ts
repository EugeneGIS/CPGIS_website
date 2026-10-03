import { afterEach, describe, expect, it, vi } from "vitest";
import { renderMapPreview } from "@/lib/map-preview";
import { mapShareInputSchema } from "@/lib/map-share";

afterEach(() => vi.unstubAllGlobals());

describe("map share preview", () => {
  it.each(["light", "dark"] as const)("renders a %s PNG when OpenFreeMap is unavailable", async (theme) => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const response = await renderMapPreview({
      jobs: [],
      input: mapShareInputSchema.parse({
        bounds: { north: 55, south: 45, west: 5, east: 15 },
        query: "",
        includeExpired: false,
        theme,
      }),
      createdAt: "2026-10-01T12:00:00.000Z",
      persisted: false,
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toContain("s-maxage=600");
    expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const image = new DataView(bytes.buffer);
    expect(image.getUint32(16)).toBe(1200);
    expect(image.getUint32(20)).toBe(630);
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith("https://tiles.openfreemap.org/planet/latest/"))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("basemaps.cartocdn.com"))).toBe(false);
  });
});
