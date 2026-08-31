"use client";

import type { GeoJsonObject } from "geojson";
import { GeoJSON, Pane } from "react-leaflet";
import tenDashLine from "@/data/china-ten-dash-line.json";
import {
  getSouthChinaSeaLineStyle,
  SOUTH_CHINA_SEA_ATTRIBUTION,
  type SouthChinaSeaTheme,
} from "./south-china-sea-style";

const TEN_DASH_GEOJSON = tenDashLine as unknown as GeoJsonObject;

export function SouthChinaSeaLayer({
  theme,
}: {
  theme: SouthChinaSeaTheme;
}) {
  return (
    <Pane
      name="south-china-sea-ten-dash-line"
      style={{ zIndex: 350, pointerEvents: "none" }}
    >
      <GeoJSON
        key={theme}
        data={TEN_DASH_GEOJSON}
        attribution={SOUTH_CHINA_SEA_ATTRIBUTION}
        interactive={false}
        style={getSouthChinaSeaLineStyle(theme)}
      />
    </Pane>
  );
}
