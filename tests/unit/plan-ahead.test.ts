import { describe, expect, it } from "vitest";
import { buildPlanAheadData, isJobExpired } from "@/lib/job-filters";
import type { JobRecord } from "@/lib/types";

let counter = 0;

function makeJob(overrides: Partial<JobRecord> = {}): JobRecord {
  counter += 1;

  return {
    id: `job-${counter}`,
    slug: `job-${counter}`,
    title: `Research Fellow opening ${counter}`,
    organization: "Example University",
    summary: "A summary that is long enough to look like a real record.",
    applicationUrl: "https://example.org/job",
    deadlineText: "Open until filled",
    status: "published",
    tags: [],
    createdAt: "2026-06-15T09:00:00.000Z",
    updatedAt: "2026-06-15T09:00:00.000Z",
    location: {
      label: "Zurich, Switzerland",
      city: "Zurich",
      country: "Switzerland",
      latitude: 47.3769,
      longitude: 8.5417,
    },
    ...overrides,
  };
}

describe("isJobExpired", () => {
  it("keeps a deadline job valid through its deadline day", () => {
    const job = makeJob({ applyBy: "2026-09-30" });

    expect(isJobExpired(job, "2026-09-30")).toBe(false);
    expect(isJobExpired(job, "2026-10-01")).toBe(true);
  });

  it("expires a rolling post after two months of publication", () => {
    const job = makeJob({ sourceDate: "2026-06-30" });

    expect(isJobExpired(job, "2026-08-30")).toBe(false);
    expect(isJobExpired(job, "2026-08-31")).toBe(true);
  });

  it("falls back to createdAt when a rolling post has no source date", () => {
    const job = makeJob({ createdAt: "2026-07-15T00:00:00.000Z" });

    expect(isJobExpired(job, "2026-09-15")).toBe(false);
    expect(isJobExpired(job, "2026-09-16")).toBe(true);
  });
});

describe("buildPlanAheadData", () => {
  it("buckets by application deadline month and splits active from past", () => {
    const septemberEarly = makeJob({
      applyBy: "2026-09-05",
      deadlineText: "apply by 5 Sep 2026",
    });
    const septemberLate = makeJob({
      applyBy: "2026-09-20",
      deadlineText: "apply by 20 Sep 2026",
    });
    const passedThisMonth = makeJob({
      applyBy: "2026-08-15",
      deadlineText: "apply by 15 Aug 2026",
    });
    const archived = makeJob({
      applyBy: "2026-04-10",
      deadlineText: "apply by 10 Apr 2026",
    });

    const data = buildPlanAheadData(
      [septemberEarly, septemberLate, passedThisMonth, archived],
      "2026-08-31",
    );

    expect(data.currentMonth).toBe("2026-08");
    expect(data.upcoming).toEqual([{ label: "2026-09", value: 2 }]);
    expect(data.past).toEqual([{ label: "2026-04", value: 1 }]);
    expect(data.jobsByMonth["2026-09"].map((job) => job.id)).toEqual([
      septemberEarly.id,
      septemberLate.id,
    ]);
  });

  it("collects only rolling posts inside the two-month window, newest first", () => {
    const fresh = makeJob({ sourceDate: "2026-07-10" });
    const freshest = makeJob({ sourceDate: "2026-08-20" });
    const stale = makeJob({ sourceDate: "2026-04-01" });

    const data = buildPlanAheadData([fresh, stale, freshest], "2026-08-31");

    expect(data.rolling.map((job) => job.id)).toEqual([freshest.id, fresh.id]);
    expect(data.upcoming).toEqual([]);
    expect(data.past).toEqual([]);
  });
});
