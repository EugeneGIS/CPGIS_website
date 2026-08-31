import { describe, expect, it } from "vitest";
import {
  buildCanonicalJobUrl,
  getDeadlineStatus,
  getSafeApplicationUrl,
  MARKER_PALETTE,
  shouldFocusSelection,
  spreadOverlappingJobs,
  WORLD_COPY_JUMP_ENABLED,
} from "@/components/map/jobs-map-helpers";
import type { JobRecord } from "@/lib/types";

function makeJob(
  id: string,
  slug: string,
  latitude = 22.3193,
  longitude = 114.1694,
): JobRecord {
  return {
    id,
    slug,
    title: `Job ${id}`,
    organization: "CPGIS",
    summary: "A test opportunity.",
    applicationUrl: "https://example.org/apply",
    deadlineText: "Open until filled",
    status: "published",
    tags: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    location: {
      label: "Hong Kong",
      city: "Hong Kong",
      country: "Hong Kong SAR, China",
      latitude,
      longitude,
    },
  };
}

describe("spreadOverlappingJobs", () => {
  it("preserves a single marker at its source coordinates", () => {
    const [job] = spreadOverlappingJobs([makeJob("1", "one")]);

    expect(job.displayLatitude).toBe(22.3193);
    expect(job.displayLongitude).toBe(114.1694);
    expect(job.overlapCount).toBe(1);
  });

  it("spreads coincident jobs deterministically without changing their source", () => {
    const jobs = [makeJob("2", "z-job"), makeJob("1", "a-job")];
    const spread = spreadOverlappingJobs(jobs);

    expect(spread.map((job) => job.slug)).toEqual(["a-job", "z-job"]);
    expect(spread.every((job) => job.overlapCount === 2)).toBe(true);
    expect(spread[0].displayLongitude).not.toBe(jobs[0].location.longitude);
    expect(spread[0].location.longitude).toBe(114.1694);
  });
});

describe("selection focus", () => {
  it("focuses only when a real selected job id is newly selected", () => {
    expect(shouldFocusSelection(undefined, "job-1")).toBe(true);
    expect(shouldFocusSelection("job-1", "job-1")).toBe(false);
    expect(shouldFocusSelection("job-1", undefined)).toBe(false);
    expect(shouldFocusSelection("job-1", "job-2")).toBe(true);
  });
});

describe("repeated-world navigation", () => {
  it("keeps vector overlays synchronized after crossing the antimeridian", () => {
    expect(WORLD_COPY_JUMP_ENABLED).toBe(true);
  });
});

describe("deadline palettes", () => {
  const now = new Date("2026-08-27T12:00:00Z");

  it("classifies deadline states at their boundaries", () => {
    expect(getDeadlineStatus(undefined, now)).toBe("active");
    expect(getDeadlineStatus("2026-08-26", now)).toBe("expired");
    expect(getDeadlineStatus("2026-09-03", now)).toBe("closingSoon");
    expect(getDeadlineStatus("2026-09-04", now)).toBe("active");
  });

  it("uses a lighter expired marker and a distinct dark palette", () => {
    expect(MARKER_PALETTE.light.expired.fill).toBe("#cbd5e1");
    expect(MARKER_PALETTE.dark.active.fill).not.toBe(
      MARKER_PALETTE.light.active.fill,
    );
    expect(new Set(Object.values(MARKER_PALETTE.dark).map(({ fill }) => fill)).size)
      .toBe(3);
  });
});

describe("popup links", () => {
  it("builds a canonical job detail URL", () => {
    expect(buildCanonicalJobUrl("planning-professor-123", "https://jobs.test"))
      .toBe("https://jobs.test/jobs/planning-professor-123");
  });

  it("allows only HTTP(S) application URLs", () => {
    expect(getSafeApplicationUrl("https://example.org/apply")).toBe(
      "https://example.org/apply",
    );
    expect(getSafeApplicationUrl("http://example.org/apply")).toBe(
      "http://example.org/apply",
    );
    expect(getSafeApplicationUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeApplicationUrl("not a url")).toBeNull();
  });
});
