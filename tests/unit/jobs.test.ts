import { describe, expect, it } from "vitest";
import jobs from "@/data/cpgis-jobs.json";
import legacySlugs from "@/data/legacy-job-slug-redirects.json";
import { createJobSlug } from "@/lib/job-identity";
import { mapSupabaseRowToJob } from "@/lib/jobs";

function supabaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    slug: "legacy-database-slug",
    title: "Postdoctoral Research Fellow",
    organization: "Example University",
    summary: "A sufficiently detailed summary.",
    application_url: "https://example.org/jobs/42",
    status: "published",
    tags: ["GIS"],
    created_at: "2026-08-24T09:00:00.000Z",
    updated_at: "2026-08-24T09:00:00.000Z",
    city: "Zurich",
    country: "Switzerland",
    latitude: 47.3769,
    longitude: 8.5417,
    ...overrides,
  };
}

describe("mapSupabaseRowToJob", () => {
  it("publishes the canonical identity for a known bundled legacy slug", () => {
    const bundledJob = jobs[0];
    const canonicalToLegacy = legacySlugs.canonicalToLegacy as Record<
      string,
      string
    >;
    const row = supabaseRow({
      slug: canonicalToLegacy[bundledJob.slug],
      title: bundledJob.title,
      organization: bundledJob.organization,
      application_url: bundledJob.applicationUrl,
    });
    const job = mapSupabaseRowToJob(row);

    expect(job.slug).toBe(
      createJobSlug({
        title: String(row.title),
        organization: String(row.organization),
        applicationUrl: String(row.application_url),
      }),
    );
    expect(job.slug).not.toBe(row.slug);
  });

  it("preserves an unknown stored slug until it has an explicit alias or backfill", () => {
    const row = supabaseRow();
    const job = mapSupabaseRowToJob(row);

    expect(job.slug).toBe("legacy-database-slug");
  });

  it("normalizes policy-sensitive country and location labels", () => {
    const job = mapSupabaseRowToJob(
      supabaseRow({ city: "Hong Kong", country: "Hong Kong" }),
    );

    expect(job.location.country).toBe("Hong Kong SAR, China");
    expect(job.location.label).toBe("Hong Kong, Hong Kong SAR, China");
  });
});
