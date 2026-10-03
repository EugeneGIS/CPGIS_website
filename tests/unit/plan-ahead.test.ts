import { describe, expect, it } from "vitest";
import { appointmentStartDate, buildPlanAheadData, isJobExpired, rollingExpiryDate } from "@/lib/job-filters";
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

  it("expires a rolling post after 60 days when no start date is given", () => {
    const job = makeJob({ sourceDate: "2026-06-30" });

    expect(rollingExpiryDate(job)).toBe("2026-08-29");
    expect(isJobExpired(job, "2026-08-29")).toBe(false);
    expect(isJobExpired(job, "2026-08-30")).toBe(true);
  });

  it("falls back to createdAt when a rolling post has no source date", () => {
    const job = makeJob({ createdAt: "2026-07-15T00:00:00.000Z" });

    expect(isJobExpired(job, "2026-09-13")).toBe(false);
    expect(isJobExpired(job, "2026-09-14")).toBe(true);
  });

  it("uses a stated appointment day instead of the post age", () => {
    const job = makeJob({
      sourceDate: "2026-01-01",
      description: "Position open until filled (appointment starts on 17 Aug 2026)",
    });

    expect(appointmentStartDate(job)).toBe("2026-08-17");
    expect(isJobExpired(job, "2026-08-17")).toBe(false);
    expect(isJobExpired(job, "2026-08-18")).toBe(true);
  });

  it("uses the last day of a stated appointment month", () => {
    const job = makeJob({
      sourceDate: "2026-01-01",
      description: "Position open until filled (appointment begins in Dec 2026)",
    });

    expect(rollingExpiryDate(job)).toBe("2026-12-31");
    expect(isJobExpired(job, "2026-12-31")).toBe(false);
    expect(isJobExpired(job, "2027-01-01")).toBe(true);
  });

  it("recognizes month-only appointment dates in imported job text", () => {
    const job = makeJob({
      sourceDate: "2026-07-01",
      description: "Position open until filled (appointment begins in Sep 2026)",
    });

    expect(appointmentStartDate(job)).toBe("2026-09-30");
    expect(isJobExpired(job, "2026-09-30")).toBe(false);
    expect(isJobExpired(job, "2026-10-01")).toBe(true);
  });

  it("falls back to 60 days for ambiguous or invalid appointment dates", () => {
    const ambiguous = makeJob({ sourceDate: "2026-06-30", description: "appointment starts in Oct/Nov 2026" });
    const invalid = makeJob({ sourceDate: "2026-06-30", description: "appointment starts on 31 Feb 2027" });

    expect(appointmentStartDate(ambiguous)).toBeNull();
    expect(appointmentStartDate(invalid)).toBeNull();
    expect(rollingExpiryDate(ambiguous)).toBe("2026-08-29");
    expect(rollingExpiryDate(invalid)).toBe("2026-08-29");
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

  it("collects rolling posts still valid by start date or 60-day fallback, newest first", () => {
    const fresh = makeJob({ sourceDate: "2026-07-10" });
    const freshest = makeJob({ sourceDate: "2026-08-20" });
    const stale = makeJob({ sourceDate: "2026-04-01" });
    const olderWithFutureStart = makeJob({ sourceDate: "2026-03-01", description: "appointment starts on 1 Sep 2026" });

    const data = buildPlanAheadData([fresh, stale, freshest, olderWithFutureStart], "2026-08-31");

    expect(data.rolling.map((job) => job.id)).toEqual([freshest.id, fresh.id, olderWithFutureStart.id]);
    expect(data.upcoming).toEqual([]);
    expect(data.past).toEqual([]);
  });
});
