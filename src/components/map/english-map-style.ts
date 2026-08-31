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

export function textFieldContainsName(textField: unknown): boolean {
  if (typeof textField === "string") {
    return /(?:^|[{:])name(?::[a-z-]+)?(?:}|$)/i.test(textField);
  }

  if (!Array.isArray(textField)) {
    return false;
  }

  return textField.some((part) => textFieldContainsName(part));
}
