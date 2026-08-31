import { describe, expect, it } from "vitest";
import {
  JOB_FEED_BATCH_SIZE,
  nextJobFeedCount,
  sortJobsForFeed,
} from "@/lib/job-feed";
import type { JobRecord } from "@/lib/types";

function job(id: string, sourceDate: string): JobRecord {
  return {
    id,
    slug: id,
    title: `Job ${id}`,
    organization: "Example University",
    summary: "Summary",
    applicationUrl: `https://example.org/${id}`,
    deadlineText: "Open until filled",
    status: "published",
    sourceDate,
    tags: [],
    createdAt: `${sourceDate}T00:00:00.000Z`,
    updatedAt: `${sourceDate}T00:00:00.000Z`,
    location: {
      label: "Zurich, Switzerland",
      city: "Zurich",
      country: "Switzerland",
      latitude: 47.37,
      longitude: 8.54,
    },
  };
}

describe("sortJobsForFeed", () => {
  it("orders matching jobs newest first when nothing is selected", () => {
    const sorted = sortJobsForFeed([
      job("old", "2026-01-01"),
      job("new", "2026-03-01"),
      job("middle", "2026-02-01"),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(["new", "middle", "old"]);
  });

  it("brings a selected map job to the top without dropping other jobs", () => {
    const sorted = sortJobsForFeed(
      [job("new", "2026-03-01"), job("old", "2026-01-01")],
      "old",
    );

    expect(sorted.map(({ id }) => id)).toEqual(["old", "new"]);
  });
});

describe("nextJobFeedCount", () => {
  it("loads five at a time and stops at the number of matching jobs", () => {
    expect(JOB_FEED_BATCH_SIZE).toBe(5);
    expect(nextJobFeedCount(5, 13)).toBe(10);
    expect(nextJobFeedCount(10, 13)).toBe(13);
    expect(nextJobFeedCount(13, 13)).toBe(13);
  });
});
