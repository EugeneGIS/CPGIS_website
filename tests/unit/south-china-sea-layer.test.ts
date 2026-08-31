import { describe, expect, it } from "vitest";
import tenDashLine from "@/data/china-ten-dash-line.json";
import {
  getSouthChinaSeaLineStyle,
  SOUTH_CHINA_SEA_ATTRIBUTION,
} from "@/components/map/south-china-sea-style";

describe("South China Sea ten-dash layer", () => {
  it("contains the ten validated WGS84 line segments", () => {
    expect(tenDashLine.type).toBe("FeatureCollection");
    expect(tenDashLine.features).toHaveLength(10);
    expect(
      tenDashLine.features
        .map((feature) => feature.properties.source_segment_id)
        .sort((a, b) => a - b),
    ).toEqual([691, 937, 975, 1073, 1079, 1086, 1106, 1362, 1367, 1382]);

    for (const feature of tenDashLine.features) {
      expect(feature.geometry.type).toBe("LineString");
      expect(feature.properties.gbcode).toBe(61010);
      expect(feature.properties.label).toBe("South China Sea ten-dash line");
    }
  });

  it("stays within the supplied South China Sea extent", () => {
    const coordinates = tenDashLine.features.flatMap(
      (feature) => feature.geometry.coordinates,
    );
    const longitudes = coordinates.map(([longitude]) => longitude);
    const latitudes = coordinates.map(([, latitude]) => latitude);

    expect(Math.min(...longitudes)).toBeCloseTo(108.200763, 6);
    expect(Math.max(...longitudes)).toBeCloseTo(122.818563, 6);
    expect(Math.min(...latitudes)).toBeCloseTo(3.407817, 6);
    expect(Math.max(...latitudes)).toBeCloseTo(24.565936, 6);
  });

  it("uses a theme-aware solid boundary stroke and records provenance", () => {
    const light = getSouthChinaSeaLineStyle("light");
    const dark = getSouthChinaSeaLineStyle("dark");

    expect(light.color).not.toBe(dark.color);
    expect(light.dashArray).toBeUndefined();
    expect(dark.dashArray).toBeUndefined();
    expect(light.className).toBe("cpgis-south-china-sea-line");
    expect(SOUTH_CHINA_SEA_ATTRIBUTION).toContain("GS(2020)4619");
  });
});
