import { describe, expect, it } from "vitest";
import {
  buildSummary,
  extractJobFromText,
  inferTags,
  splitDepartment,
} from "@/lib/extract";

describe("extractJobFromText", () => {
  it("extracts a CPGIS-style line with full confidence", () => {
    const draft = extractJobFromText(
      "Postdoctoral researcher position in urban climate resilience available at the Department of Geography, University of Zurich https://example.org/jobs/42 Apply by 30 October 2026. Contact jobs@geo.uzh.ch",
    );

    expect(draft.title).toMatchObject({
      value: "Postdoctoral researcher position in urban climate resilience",
      confidence: "ok",
    });
    expect(draft.organization.value).toBe("University of Zurich");
    expect(draft.department.value).toBe("Department of Geography");
    expect(draft.applicationUrl).toMatchObject({
      value: "https://example.org/jobs/42",
      confidence: "ok",
    });
    expect(draft.applyBy).toMatchObject({ value: "2026-10-30", confidence: "ok" });
    expect(draft.contactEmail.value).toBe("jobs@geo.uzh.ch");
    expect(draft.tags).toContain("postdoc");
  });

  it("recognises open-until-filled phrasing", () => {
    const draft = extractJobFromText(
      "Research Fellow available at Example University https://example.org/job position until filled",
    );

    expect(draft.applyBy).toMatchObject({ value: "", confidence: "ok" });
    expect(draft.deadlineText).toBe("Position open until filled");
  });

  it("flags unparseable deadline wording as uncertain", () => {
    const draft = extractJobFromText(
      "Lecturer available at Example University https://example.org/job apply by mid to late Jan 2027",
    );

    expect(draft.applyBy.confidence).toBe("uncertain");
    expect(draft.applyBy.value).toBe("");
  });

  it("parses Month D, YYYY deadlines from free text", () => {
    const draft = extractJobFromText(
      "The Department of Geosciences is hiring an assistant professor. Deadline: September 15, 2026. Apply at https://example.org/careers",
    );

    expect(draft.applyBy).toMatchObject({ value: "2026-09-15", confidence: "ok" });
    expect(draft.applicationUrl.value).toBe("https://example.org/careers");
  });

  it("marks free-text guesses as uncertain and flags missing fields", () => {
    const draft = extractJobFromText(
      "We are hiring! Great team, great science. applications reviewed until the position is filled",
    );

    expect(draft.title.confidence).not.toBe("ok");
    expect(draft.organization.confidence).toBe("missing");
    expect(draft.applicationUrl.confidence).toBe("missing");
  });

  it("parses ISO and day-first slashed dates", () => {
    const iso = extractJobFromText("Job at Some University https://a.io/1 apply by 2026-12-01");
    expect(iso.applyBy.value).toBe("2026-12-01");

    const slashed = extractJobFromText("Job at Some University https://a.io/1 due 5 Feb 2027");
    expect(slashed.applyBy.value).toBe("2027-02-05");
  });
});

describe("splitDepartment", () => {
  it("splits a department prefix from the organization", () => {
    const result = splitDepartment(
      "the Department of Civil and Environmental Engineering, Norwegian University of Science and Technology",
    );

    expect(result.department).toBe(
      "Department of Civil and Environmental Engineering",
    );
    expect(result.organization).toBe(
      "Norwegian University of Science and Technology",
    );
  });

  it("leaves plain organizations untouched", () => {
    expect(splitDepartment("Costain")).toEqual({
      department: "",
      organization: "Costain",
    });
  });
});

describe("inferTags", () => {
  it("caps tags at four entries without duplicates", () => {
    const tags = inferTags(
      "Assistant Professor in GIS, remote sensing, spatial analysis, urban climate, hydrology and ecology",
    );

    expect(tags.length).toBeLessThanOrEqual(4);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("buildSummary", () => {
  it("pads very short summaries to the validation minimum", () => {
    expect(buildSummary("GIS job", "ETH").length).toBeGreaterThanOrEqual(24);
  });
});
