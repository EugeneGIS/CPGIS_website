import { afterEach, describe, expect, it, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import { PbfWriter } from "pbf";
import { renderMapPreview } from "@/lib/map-preview";
import { mapShareInputSchema } from "@/lib/map-share";
import { loadOpenFreeMapPreview } from "@/lib/openfreemap-preview";
import type { JobRecord } from "@/lib/types";

afterEach(() => vi.unstubAllGlobals());

function fixtureTile() {
  const pbf = new PbfWriter();
  pbf.writeMessage(3, (_, layer) => {
    layer.writeStringField(1, "water");
    layer.writeMessage(2, (_, feature) => {
      feature.writeVarintField(3, 3);
      feature.writePackedVarint(4, [9, 0, 0, 26, 8192, 0, 0, 8192, 8191, 0, 15]);
    }, null);
    layer.writeVarintField(5, 4096);
    layer.writeVarintField(15, 2);
  }, null);
  pbf.writeMessage(3, (_, layer) => {
    layer.writeStringField(1, "boundary");
    layer.writeMessage(2, (_, feature) => {
      feature.writeVarintField(3, 2);
      feature.writePackedVarint(4, [9, 0, 0, 10, 8192, 0]);
    }, null);
    layer.writeVarintField(5, 4096);
    layer.writeVarintField(15, 2);
  }, null);
  pbf.writeMessage(3, (_, layer) => {
    layer.writeStringField(1, "place");
    layer.writeStringField(3, "name:en");
    layer.writeStringField(3, "class");
    layer.writeMessage(4, (_, value) => value.writeStringField(1, "Lausanne"), null);
    layer.writeMessage(4, (_, value) => value.writeStringField(1, "city"), null);
    layer.writeMessage(2, (_, feature) => {
      feature.writePackedVarint(2, [0, 0, 1, 1]);
      feature.writeVarintField(3, 1);
      feature.writePackedVarint(4, [9, 4096, 4096]);
    }, null);
    layer.writeVarintField(5, 4096);
    layer.writeVarintField(15, 2);
  }, null);
  return pbf.finish();
}

describe("OpenFreeMap share preview", () => {
  it("uses cloud vector tiles and omits political boundary geometry", async () => {
    const bytes = fixtureTile();
    const fetchMock = vi.fn().mockResolvedValue(new Response(Uint8Array.from(bytes).buffer, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const layers = await loadOpenFreeMapPreview({ zoom: 2, center: { x: 384, y: 384 } }, 256, 256);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://tiles.openfreemap.org/planet/latest/2/1/1.pbf");
    expect(layers.water).toContain("M0,0L256,0L256,256L0,256Z");
    expect(layers.roads).toBe("");
    expect(layers.places).toEqual([{ x: 128, y: 128, name: "Lausanne" }]);
    expect(layers.loadedTiles).toBe(1);
    expect(layers.missingTiles).toBe(0);
  });

  it("reports unavailable tiles without substituting a watermark image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 403 })));
    const layers = await loadOpenFreeMapPreview({ zoom: 2, center: { x: 384, y: 384 } }, 256, 256);
    expect(layers.water).toBe("");
    expect(layers.loadedTiles).toBe(0);
    expect(layers.missingTiles).toBe(1);
  });

  it.each(["light", "dark"] as const)("renders a %s PNG when vector basemap features are available", async (theme) => {
    const bytes = Uint8Array.from(fixtureTile()).buffer;
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      String(input).startsWith("https://tiles.openfreemap.org/planet/latest/")
        ? Promise.resolve(new Response(bytes.slice(0), { status: 200 }))
        : realFetch(input, init)));
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
    const png = new Uint8Array(await response.arrayBuffer());
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(10_000);
  });

  it.skipIf(process.env.CPGIS_TEST_LIVE_TILES !== "1")("renders a real OpenFreeMap tile selection", async () => {
    const markerJob = (city: string, latitude: number, longitude: number): JobRecord => ({
      id: city.toLowerCase(), slug: city.toLowerCase(), title: `Test job in ${city}`,
      organization: "Preview test", summary: "", applicationUrl: "https://example.com",
      deadlineText: "Open until filled", status: "published", tags: [],
      createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z",
      location: { label: city, city, country: "Europe", latitude, longitude },
    });
    const areas = [
      { name: "world", bounds: { north: 70.4368, south: -11.69527, west: -115.3125, east: 136.75781 } },
      { name: "europe", bounds: { north: 60, south: 32, west: -22, east: 40 } },
      { name: "hong-kong", bounds: { north: 23, south: 22, west: 113.5, east: 114.7 } },
    ];
    for (const area of areas) {
      const view = {
        jobs: area.name === "europe"
          ? [markerJob("London", 51.5074, -0.1278), markerJob("Geneva", 46.2044, 6.1432)]
          : [],
        input: mapShareInputSchema.parse({
          bounds: area.bounds,
          query: "",
          includeExpired: false,
          theme: "light",
        }),
        createdAt: "2026-10-01T12:00:00.000Z",
        persisted: false,
      };
      const response = await renderMapPreview(view);
      const png = new Uint8Array(await response.arrayBuffer());
      if (process.env.CPGIS_PREVIEW_OUTPUT) {
        await writeFile(process.env.CPGIS_PREVIEW_OUTPUT.replace(/\.png$/, `-${area.name}.png`), png);
      }
      expect(png.length).toBeGreaterThan(10_000);
    }
  }, 60_000);
});
