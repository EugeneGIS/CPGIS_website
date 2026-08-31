import { describe, expect, it } from "vitest";
import {
  ENGLISH_LABEL_EXPRESSION,
  OPENFREEMAP_STYLE_URL,
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
});
