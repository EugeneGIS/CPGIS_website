import { describe, expect, it } from "vitest";
import {
  buildCanonicalJobUrl,
  getJobShareDescription,
  getJobShareTitle,
  getSafeHttpOrigin,
  getSafeHttpUrl,
  toShareSafeText,
} from "@/lib/job-share";
import type { JobRecord } from "@/lib/types";

const job: JobRecord = {
  id: "job-1",
  slug: "research-fellow-abc123",
  title: "Research\nFellow",
  organization: "Example University",
  summary: "Study spatial data and urban systems.",
  applicationUrl: "https://example.org/apply",
  deadlineText: "Open until filled",
  status: "published",
  tags: ["GIS"],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  location: {
    label: "Hong Kong SAR, China",
    city: "Hong Kong",
    country: "Hong Kong SAR, China",
    latitude: 22.3193,
    longitude: 114.1694,
  },
};

describe("job share helpers", () => {
  it("returns a safe metadata origin from the configured app URL", () => {
    expect(getSafeHttpOrigin("https://jobs.example.org/base/path")).toBe(
      "https://jobs.example.org",
    );
    expect(getSafeHttpOrigin("javascript:alert(1)")).toBe(
      "http://localhost:3000",
    );
  });

  it("builds an encoded canonical URL from an HTTP(S) app origin", () => {
    expect(
      buildCanonicalJobUrl("job with spaces", "https://jobs.example.org/base"),
    ).toBe("https://jobs.example.org/jobs/job%20with%20spaces");
  });

  it("falls back safely when the configured base URL is not HTTP(S)", () => {
    expect(buildCanonicalJobUrl("job", "javascript:alert(1)")).toBe(
      "http://localhost:3000/jobs/job",
    );
  });

  it("normalizes unsafe control characters and truncates OG text", () => {
    expect(toShareSafeText("  Hello\n\u0000 world  ", 20)).toBe("Hello world");
    expect(toShareSafeText("abcdefghijkl", 8)).toBe("abcdefg…");
  });

  it("creates bounded, normalized job metadata text", () => {
    expect(getJobShareTitle(job)).toBe(
      "Research Fellow — Example University",
    );
    expect(getJobShareDescription(job)).toContain(
      "Research Fellow at Example University in Hong Kong SAR, China.",
    );
    expect(getJobShareDescription(job).length).toBeLessThanOrEqual(180);
  });

  it("allows only HTTP(S) application URLs", () => {
    expect(getSafeHttpUrl("https://example.org/apply")).toBe(
      "https://example.org/apply",
    );
    expect(getSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeHttpUrl("not a url")).toBeNull();
  });
});
