import { describe, expect, it } from "vitest";
import {
  ENGLISH_LABEL_EXPRESSION,
  OPENFREEMAP_STYLE_URL,
  TAIPEI_CITY_LABEL_MATCH,
  taipeiCityTextSize,
  textFieldContainsName,
} from "@/components/map/english-map-style";

describe("English vector basemap policy", () => {
  it("uses keyless OpenFreeMap vector styles for both themes", () => {
    expect(OPENFREEMAP_STYLE_URL.light).toBe(
      "https://tiles.openfreemap.org/styles/positron",
    );
    expect(OPENFREEMAP_STYLE_URL.dark).toBe(
      "https://tiles.openfreemap.org/styles/positron",
    );
  });

  it("prefers English, then Latin transliteration, then the local name", () => {
    expect(ENGLISH_LABEL_EXPRESSION).toEqual([
      "coalesce",
      ["get", "name:en"],
      ["get", "name:latin"],
      ["get", "name"],
    ]);
  });

  it("changes only name-based text fields", () => {
    expect(textFieldContainsName(["get", "name"])).toBe(true);
    expect(textFieldContainsName(["coalesce", ["get", "name:de"], ["get", "name"]])).toBe(true);
    expect(textFieldContainsName("{name:zh}" )).toBe(true);
    expect(textFieldContainsName(["get", "ref"])).toBe(false);
    expect(textFieldContainsName(["get", "housenumber"])).toBe(false);
  });

  it("targets Taipei for ordinary city styling without changing other capitals", () => {
    expect(TAIPEI_CITY_LABEL_MATCH).toContainEqual(["==", ["get", "name_en"], "Taipei"]);
    expect(TAIPEI_CITY_LABEL_MATCH).toContainEqual(["==", ["get", "name"], "臺北"]);
  });

  it("uses one zoom expression to match ordinary-city sizing for Taipei", () => {
    const regular = ["interpolate", ["exponential", 1.2], ["zoom"], 4, 11, 7, 13, 11, 18];
    const capital = ["interpolate", ["exponential", 1.2], ["zoom"], 4, 12, 7, 14, 11, 20];
    expect(taipeiCityTextSize(regular, capital)).toEqual([
      "interpolate", ["exponential", 1.2], ["zoom"],
      4, ["case", TAIPEI_CITY_LABEL_MATCH, 11, 12],
      7, ["case", TAIPEI_CITY_LABEL_MATCH, 13, 14],
      11, ["case", TAIPEI_CITY_LABEL_MATCH, 18, 20],
    ]);
    expect(taipeiCityTextSize(regular, ["interpolate", ["linear"], ["zoom"], 4, 12])).toBeNull();
  });
});
