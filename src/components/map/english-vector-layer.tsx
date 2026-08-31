"use client";

import { useEffect } from "react";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { setWorkerUrl } from "maplibre-gl";
import { useMap } from "react-leaflet";
import {
  ENGLISH_LABEL_EXPRESSION,
  OPENFREEMAP_ATTRIBUTION,
  OPENFREEMAP_STYLE_URL,
  textFieldContainsName,
  type EnglishMapTheme,
} from "./english-map-style";

export function EnglishVectorLayer({ theme }: { theme: EnglishMapTheme }) {
  const map = useMap();

  useEffect(() => {
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const layer = maplibreGL({
      attributionControl: false,
      interactive: false,
      style: OPENFREEMAP_STYLE_URL[theme],
    }).addTo(map);
    layer
      .getContainer()
      .classList.toggle("cpgis-vector-map-dark", theme === "dark");
    const vectorMap = layer.getMaplibreMap();

    // OpenFreeMap's Positron style occasionally references this small POI
    // circle even when the current sprite does not include it. Supplying the
    // expected SDF icon keeps the map visually complete and avoids a noisy
    // console warning.
    vectorMap.setMissingStyleImageResolver((id) => {
      if (id !== "circle-11" || vectorMap.hasImage(id)) {
        return;
      }

      const size = 11;
      const centre = (size - 1) / 2;
      const radius = centre - 1;
      const data = new Uint8Array(size * size * 4);

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (Math.hypot(x - centre, y - centre) > radius) {
            continue;
          }

          const offset = (y * size + x) * 4;
          data[offset] = 255;
          data[offset + 1] = 255;
          data[offset + 2] = 255;
          data[offset + 3] = 255;
        }
      }

      vectorMap.addImage(id, { width: size, height: size, data }, { sdf: true });
    });

    const applyEnglishLabels = () => {
      const style = vectorMap.getStyle();

      for (const styleLayer of style.layers ?? []) {
        if (styleLayer.type !== "symbol") {
          continue;
        }

        const textField = styleLayer.layout?.["text-field"];
        if (!textFieldContainsName(textField)) {
          continue;
        }

        vectorMap.setLayoutProperty(
          styleLayer.id,
          "text-field",
          ENGLISH_LABEL_EXPRESSION,
        );
      }
    };

    vectorMap.on("style.load", applyEnglishLabels);
    map.attributionControl?.addAttribution(OPENFREEMAP_ATTRIBUTION);

    return () => {
      vectorMap.off("style.load", applyEnglishLabels);
      vectorMap.setMissingStyleImageResolver(null);
      map.attributionControl?.removeAttribution(OPENFREEMAP_ATTRIBUTION);
      layer.remove();
    };
  }, [map, theme]);

  return null;
}
