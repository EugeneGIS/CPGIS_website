import type { ExpressionSpecification } from "maplibre-gl";

export type EnglishMapTheme = "light" | "dark";

export const OPENFREEMAP_STYLE_URL: Record<EnglishMapTheme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/positron",
};

export const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; ' +
  '<a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from ' +
  '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const ENGLISH_LABEL_EXPRESSION: [
  "coalesce",
  ["get", "name:en"],
  ["get", "name:latin"],
  ["get", "name"],
] = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name:latin"],
  ["get", "name"],
];

export const TAIPEI_CITY_LABEL_MATCH: ExpressionSpecification = [
  "any",
  ["==", ["get", "name_en"], "Taipei"],
  ["==", ["get", "name:en"], "Taipei"],
  ["==", ["get", "name"], "Taipei"],
  ["==", ["get", "name"], "台北"],
  ["==", ["get", "name"], "臺北"],
];

function zoomSizeStops(value: unknown) {
  if (!Array.isArray(value) || value[0] !== "interpolate" ||
    !Array.isArray(value[1]) || !Array.isArray(value[2]) || value[2][0] !== "zoom" ||
    value.length < 5 || (value.length - 3) % 2 !== 0) return null;

  const stops: Array<[number, number]> = [];
  for (let index = 3; index < value.length; index += 2) {
    if (typeof value[index] !== "number" || typeof value[index + 1] !== "number") return null;
    stops.push([value[index], value[index + 1]]);
  }
  return { interpolation: value[1], stops };
}

export function taipeiCityTextSize(ordinary: unknown, capital: unknown): ExpressionSpecification | null {
  const ordinarySize = zoomSizeStops(ordinary);
  const capitalSize = zoomSizeStops(capital);
  if (!ordinarySize || !capitalSize ||
    JSON.stringify(ordinarySize.interpolation) !== JSON.stringify(capitalSize.interpolation) ||
    ordinarySize.stops.length !== capitalSize.stops.length ||
    ordinarySize.stops.some(([zoom], index) => zoom !== capitalSize.stops[index][0])) return null;

  const stops = ordinarySize.stops.flatMap(([zoom, size], index) => [
    zoom, ["case", TAIPEI_CITY_LABEL_MATCH, size, capitalSize.stops[index][1]],
  ]);
  return ["interpolate", ordinarySize.interpolation, ["zoom"], ...stops] as ExpressionSpecification;
}

export function textFieldContainsName(textField: unknown): boolean {
  if (typeof textField === "string") {
    return /(?:^|[{:])name(?::[a-z-]+)?(?:}|$)/i.test(textField);
  }

  if (!Array.isArray(textField)) {
    return false;
  }

  return textField.some((part) => textFieldContainsName(part));
}
