"use client";

import { useState } from "react";
import type { GeoJsonObject } from "geojson";
import { GeoJSON, Pane, useMapEvents } from "react-leaflet";
import overview from "@/data/china-overview.json";
import type { SouthChinaSeaTheme } from "./south-china-sea-style";

const SOURCE = "China standard map GS(2020)4619 provincial polygons, overview simplified";
const MAX_OVERVIEW_ZOOM = 5;

export function ChinaOverviewLayer({ theme }: { theme: SouthChinaSeaTheme }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const map = useMapEvents({ zoomend() { setZoom(map.getZoom()); } });
  const visible = (zoom ?? map.getZoom()) < MAX_OVERVIEW_ZOOM;

  if (!visible) return null;

  return (
    <Pane name="china-overview" style={{ zIndex: 340, pointerEvents: "none" }}>
      <GeoJSON
        key={theme}
        data={overview as GeoJsonObject}
        attribution={SOURCE}
        interactive={false}
        style={{
          color: theme === "dark" ? "#8495a9" : "#97aaca",
          weight: 1,
          fillColor: theme === "dark" ? "#344458" : "#e7eef4",
          fillOpacity: 0.96,
          opacity: 0.8,
        }}
      />
    </Pane>
  );
}
