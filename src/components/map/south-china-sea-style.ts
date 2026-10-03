import type { PathOptions } from "leaflet";

export type SouthChinaSeaTheme = "light" | "dark";

export const SOUTH_CHINA_SEA_LINE_PALETTE: Record<
  SouthChinaSeaTheme,
  string
> = {
  light: "#8394aa",
  dark: "#a1b2c8",
};

export const SOUTH_CHINA_SEA_ATTRIBUTION =
  "Ten-dash: WGS84; GS(2020)4619 reference";

export function getSouthChinaSeaLineStyle(
  theme: SouthChinaSeaTheme,
): PathOptions {
  return {
    className: "cpgis-south-china-sea-line",
    color: SOUTH_CHINA_SEA_LINE_PALETTE[theme],
    fill: false,
    lineCap: "round",
    lineJoin: "round",
    opacity: theme === "dark" ? 0.7 : 0.6,
    weight: theme === "dark" ? 2.25 : 2,
  };
}
