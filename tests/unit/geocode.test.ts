import { describe, expect, it } from "vitest";
import { normalizeResults } from "@/lib/geocode";

describe("normalizeResults", () => {
  it("recovers city and country from Nominatim display_name strings", () => {
    const [result] = normalizeResults([
      {
        display_name:
          "University of Florida, Southwest 26th Drive, Gainesville, Alachua County, Florida, 32611, United States",
        lat: "29.6411884",
        lon: "-82.3562296",
      },
    ]);

    expect(result).toMatchObject({
      city: "Gainesville",
      country: "United States",
      latitude: 29.6411884,
      longitude: -82.3562296,
    });
  });

  it("keeps explicit provider fields when present", () => {
    const [result] = normalizeResults([
      {
        formatted: "Zurich, Switzerland",
        latitude: 47.3769,
        longitude: 8.5417,
        city: "Zürich",
        country: "Switzerland",
      },
    ]);

    expect(result.city).toBe("Zürich");
    expect(result.country).toBe("Switzerland");
  });

  it("falls back to the first place part for short labels", () => {
    const [result] = normalizeResults([
      { display_name: "Zurich, Switzerland", lat: 47.3769, lon: 8.5417 },
    ]);

    expect(result.city).toBe("Zurich");
    expect(result.country).toBe("Switzerland");
  });

  it("drops results without usable coordinates", () => {
    expect(
      normalizeResults([{ display_name: "Nowhere", lat: "NaN", lon: "0" }]),
    ).toEqual([]);
  });
});
