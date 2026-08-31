import type { JobLocation } from "@/lib/types";

export const REQUIRED_COUNTRY_DISPLAY = {
  hongKong: "Hong Kong SAR, China",
  macau: "Macau SAR, China",
  taiwan: "Taiwai, China",
} as const;

function countryKey(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

const COUNTRY_DISPLAY_ALIASES = new Map<string, string>([
  ["hong kong", REQUIRED_COUNTRY_DISPLAY.hongKong],
  ["hong kong sar", REQUIRED_COUNTRY_DISPLAY.hongKong],
  ["hong kong sar china", REQUIRED_COUNTRY_DISPLAY.hongKong],
  ["hong kong china", REQUIRED_COUNTRY_DISPLAY.hongKong],
  ["hong kong special administrative region", REQUIRED_COUNTRY_DISPLAY.hongKong],
  [
    "hong kong special administrative region china",
    REQUIRED_COUNTRY_DISPLAY.hongKong,
  ],
  ["macao", REQUIRED_COUNTRY_DISPLAY.macau],
  ["macao sar", REQUIRED_COUNTRY_DISPLAY.macau],
  ["macao sar china", REQUIRED_COUNTRY_DISPLAY.macau],
  ["macao china", REQUIRED_COUNTRY_DISPLAY.macau],
  ["macau", REQUIRED_COUNTRY_DISPLAY.macau],
  ["macau sar", REQUIRED_COUNTRY_DISPLAY.macau],
  ["macau sar china", REQUIRED_COUNTRY_DISPLAY.macau],
  ["macau china", REQUIRED_COUNTRY_DISPLAY.macau],
  ["macao special administrative region", REQUIRED_COUNTRY_DISPLAY.macau],
  [
    "macao special administrative region china",
    REQUIRED_COUNTRY_DISPLAY.macau,
  ],
  ["macau special administrative region", REQUIRED_COUNTRY_DISPLAY.macau],
  [
    "macau special administrative region china",
    REQUIRED_COUNTRY_DISPLAY.macau,
  ],
  ["taiwan", REQUIRED_COUNTRY_DISPLAY.taiwan],
  ["taiwan china", REQUIRED_COUNTRY_DISPLAY.taiwan],
  ["taiwan province of china", REQUIRED_COUNTRY_DISPLAY.taiwan],
  ["taiwai", REQUIRED_COUNTRY_DISPLAY.taiwan],
  ["taiwai china", REQUIRED_COUNTRY_DISPLAY.taiwan],
]);

export function normalizeCountryDisplay(country: string) {
  const trimmed = country.trim();
  return COUNTRY_DISPLAY_ALIASES.get(countryKey(trimmed)) ?? trimmed;
}

export function normalizeLocationDisplay(location: JobLocation): JobLocation {
  const city = location.city.trim();
  const country = normalizeCountryDisplay(location.country);

  return {
    ...location,
    city,
    country,
    label: [city, country].filter(Boolean).join(", "),
  };
}
