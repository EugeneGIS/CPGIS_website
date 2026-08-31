import { describe, expect, it } from "vitest";
import { buildSocialDrafts } from "@/lib/social-drafts";

describe("buildSocialDrafts", () => {
  const input = {
    title: "Postdoctoral researcher position in urban climate resilience",
    organization: "University of Zurich",
    applicationUrl: "https://example.org/jobs/42",
    applyBy: "2026-10-30",
    city: "Zurich",
    country: "Switzerland",
  };

  it("keeps the X draft within 280 characters with the link intact", () => {
    const { x } = buildSocialDrafts(input);

    expect(x.length).toBeLessThanOrEqual(280);
    expect(x).toContain(input.applicationUrl);
    expect(x).toContain("Apply by 30 Oct 2026");
    expect(x).toContain("Zurich");
  });

  it("uses open-until-filled wording without a deadline", () => {
    const { x, facebook } = buildSocialDrafts({ ...input, applyBy: undefined });

    expect(x).toContain("Open until filled");
    expect(facebook).toContain("Open until filled");
  });

  it("truncates very long titles instead of the link", () => {
    const long = buildSocialDrafts({
      ...input,
      title:
        "Senior research scientist and group lead in geospatial artificial intelligence, machine learning, and big data analytics for environmental applications " +
        "with a focus on hydrological modelling, remote sensing fusion, and climate adaptation strategies across multiple continents and research domains",
    });

    expect(long.x.length).toBeLessThanOrEqual(280);
    expect(long.x).toContain(input.applicationUrl);
    expect(long.x.endsWith(input.applicationUrl)).toBe(true);
  });

  it("builds a multi-line Facebook draft", () => {
    const { facebook } = buildSocialDrafts(input);

    expect(facebook.split("\n").length).toBeGreaterThanOrEqual(4);
    expect(facebook).toContain(input.title);
    expect(facebook).toContain("University of Zurich (Zurich, Switzerland)");
  });
});
