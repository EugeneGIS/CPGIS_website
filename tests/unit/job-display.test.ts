import { describe, expect, it } from "vitest";
import { getDisplayJobTitle, getDisplayLocation, getInstitutionParts, getResearchDirection } from "@/lib/job-display";
import type { JobRecord } from "@/lib/types";

const job = {
  title: "Postdoctoral researcher position in urban climate adaptation",
  organization: "the Department of Geography, University of Zurich",
  tags: ["climate"],
  location: { city: "Singapore", country: "Singapore", latitude: 1.3, longitude: 103.8 },
} as JobRecord;

describe("job display", () => {
  it("removes only redundant position wording", () => {
    expect(getDisplayJobTitle(job.title)).toBe("Postdoctoral researcher in urban climate adaptation");
    expect(getResearchDirection(job)).toBe("urban climate adaptation");
  });

  it("preserves institution names while cleaning a secondary unit", () => {
    expect(getInstitutionParts(job)).toEqual({ secondary: "Department of Geography", primary: "University of Zurich" });
    expect(getInstitutionParts({ ...job, organization: "The University of York" }).primary).toBe("The University of York");
    expect(getDisplayLocation(job)).toBe("Singapore");
  });
});
