import { describe, expect, it } from "vitest";
import jobs from "@/data/cpgis-jobs.json";
import legacySlugs from "@/data/legacy-job-slug-redirects.json";
import {
  createJobId,
  createJobSlug,
  createLegacyJobSlug,
} from "@/lib/job-identity";

describe("createJobSlug", () => {
  const baseJob = {
    organization: "Wageningen University & Research",
    title: "Postdoctoral researcher in integrated agronomic modelling",
    applicationUrl: "https://example.org/jobs/123",
  };

  it("is stable and remains within the public slug limit", () => {
    const slug = createJobSlug(baseJob);

    expect(createJobSlug(baseJob)).toBe(slug);
    expect(slug).toMatch(/^[a-z0-9-]+-[a-f0-9]{16}$/);
    expect(slug.length).toBeLessThanOrEqual(80);
  });

  it("distinguishes jobs whose readable prefixes would otherwise collide", () => {
    const sharedPrefix = "A".repeat(120);
    const first = createJobSlug({ ...baseJob, title: `${sharedPrefix} first` });
    const second = createJobSlug({ ...baseJob, title: `${sharedPrefix} second` });

    expect(first).not.toBe(second);
  });

  it("changes when the source application URL changes", () => {
    const first = createJobSlug(baseJob);
    const second = createJobSlug({
      ...baseJob,
      applicationUrl: "https://example.org/jobs/456",
    });

    expect(first).not.toBe(second);
  });

  it("derives a stable record ID from the same identity fields", () => {
    const id = createJobId(baseJob);

    expect(createJobId(baseJob)).toBe(id);
    expect(id).toMatch(/^job-[a-f0-9]{24}$/);
    expect(createJobId({ ...baseJob, applicationUrl: "https://example.org/other" })).not.toBe(
      id,
    );
  });
});

describe("bundled job data", () => {
  it("contains one unique public slug per job", () => {
    const slugs = jobs.map((job) => job.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("contains one stable identity-derived ID per job", () => {
    const ids = jobs.map((job) => job.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const job of jobs) {
      expect(job.id).toBe(
        createJobId({
          organization: job.organization,
          title: job.title,
          applicationUrl: job.applicationUrl,
        }),
      );
    }
  });

  it("stores the slug generated from each job's stable source fields", () => {
    for (const job of jobs) {
      expect(job.slug).toBe(
        createJobSlug({
          organization: job.organization,
          title: job.title,
          applicationUrl: job.applicationUrl,
        }),
      );
    }
  });

  it("uses only HTTP(S) application URLs", () => {
    for (const job of jobs) {
      expect(new URL(job.applicationUrl).protocol).toMatch(/^https?:$/);
    }
  });

  it("redirects only unambiguous legacy slugs to existing jobs", () => {
    const currentSlugs = new Set(jobs.map((job) => job.slug));
    const redirectKeys = new Set(Object.keys(legacySlugs.redirects));

    for (const target of Object.values(legacySlugs.redirects)) {
      expect(currentSlugs.has(target)).toBe(true);
    }

    for (const ambiguousSlug of legacySlugs.ambiguous) {
      expect(redirectKeys.has(ambiguousSlug)).toBe(false);
    }
  });

  it("records a deterministic legacy database alias for every canonical job", () => {
    const canonicalToLegacy = legacySlugs.canonicalToLegacy as Record<
      string,
      string
    >;

    expect(Object.keys(canonicalToLegacy)).toHaveLength(jobs.length);

    for (const job of jobs) {
      expect(canonicalToLegacy[job.slug]).toBe(
        createLegacyJobSlug({
          organization: job.organization,
          title: job.title,
        }),
      );
    }
  });
});
