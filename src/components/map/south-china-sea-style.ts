import type { PathOptions } from "leaflet";

export type SouthChinaSeaTheme = "light" | "dark";

export const SOUTH_CHINA_SEA_LINE_PALETTE: Record<
  SouthChinaSeaTheme,
  string
> = {
  light: "#dc2626",
  dark: "#fb7185",
};

export const SOUTH_CHINA_SEA_ATTRIBUTION =
  "Ten-dash line: supplied WGS84 data; GS(2020)4619 reference";

export function getSouthChinaSeaLineStyle(
  theme: SouthChinaSeaTheme,
): PathOptions {
  return {
    className: "cpgis-south-china-sea-line",
    color: SOUTH_CHINA_SEA_LINE_PALETTE[theme],
    fill: false,
    lineCap: "round",
    lineJoin: "round",
    opacity: theme === "dark" ? 0.95 : 0.9,
    weight: theme === "dark" ? 3.25 : 3,
  };
}
