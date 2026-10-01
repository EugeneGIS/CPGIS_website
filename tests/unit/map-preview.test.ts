import { afterEach, describe, expect, it, vi } from "vitest";
import { renderMapPreview } from "@/lib/map-preview";
import { mapShareInputSchema } from "@/lib/map-share";

afterEach(() => vi.unstubAllGlobals());

describe("map share preview", () => {
  it("renders a public PNG even when map tiles are unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await renderMapPreview({
      jobs: [],
      input: mapShareInputSchema.parse({
        bounds: { north: 55, south: 45, west: 5, east: 15 },
        query: "",
        includeExpired: false,
        theme: "light",
      }),
      createdAt: "2026-10-01T12:00:00.000Z",
      persisted: false,
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(response.headers.get("content-type")).toContain("image/png");
    expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
