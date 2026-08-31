import { describe, expect, it } from "vitest";
import {
  matchInstitutionOverride,
  institutionMatchToLocation,
} from "@/lib/institution-match";

describe("matchInstitutionOverride", () => {
  it("routes reviewed institutions to their campus coordinates", () => {
    const match = matchInstitutionOverride(
      "the Department of Forestry and Natural Resources, Purdue University",
    );

    expect(match).toMatchObject({
      city: "West Lafayette",
      country: "United States",
      latitude: 40.4237,
    });
  });

  it("matches by application URL when the alias alone is not enough", () => {
    const match = matchInstitutionOverride(
      "the French National Research Institute for Agriculture, Food, and the Environment",
      "https://bit.ly/33C3PnD",
    );

    expect(match).toMatchObject({ city: "Paris", country: "France" });

    // Without the URL the ambiguous record must NOT be dragged to Paris.
    expect(matchInstitutionOverride(
      "the Nouvelle-Aquitaine Bordeaux Centre, French National Research Institute for Agriculture",
    )).toBeNull();
  });

  it("prefers the specific entry when multiple aliases could match", () => {
    expect(
      matchInstitutionOverride("Mott MacDonald (Victoria, Australia)"),
    ).toMatchObject({ city: "Melbourne" });

    expect(matchInstitutionOverride("Mott MacDonald")).toMatchObject({
      city: "Croydon",
    });
  });

  it("normalises policy-sensitive country display", () => {
    const location = institutionMatchToLocation(
      matchInstitutionOverride("Hong Kong PolyU")!,
    );

    expect(location.country).toBe("Hong Kong SAR, China");
    expect(location.label).toBe("Hung Hom, Hong Kong SAR, China");
  });

  it("returns null for unknown organizations", () => {
    expect(matchInstitutionOverride("University of Nowhere")).toBeNull();
  });
});
