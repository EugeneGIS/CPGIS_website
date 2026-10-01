import { describe, expect, it } from "vitest";
import { demoJobs } from "@/lib/mock-data";
import {
  getLegacyJobBatch,
  LEGACY_JOB_BATCH_SIZE,
  LEGACY_JOB_COUNT,
} from "@/lib/legacy-job-import";

describe("legacy CPGIS job import", () => {
  it("maps every source job to an insertable, uniquely identified row", () => {
    expect(LEGACY_JOB_COUNT).toBe(5147);
    expect(new Set(demoJobs.map((job) => job.slug)).size).toBe(LEGACY_JOB_COUNT);

    for (let offset = 0; offset < LEGACY_JOB_COUNT; offset += LEGACY_JOB_BATCH_SIZE) {
      const batch = getLegacyJobBatch(offset);
      expect(batch).not.toBeNull();
      for (const row of batch ?? []) {
        expect(row.slug).toBeTruthy();
        expect(row.title).toBeTruthy();
        expect(row.organization).toBeTruthy();
        expect(row.summary).toBeTruthy();
        expect(row.application_url).toBeTruthy();
        expect(row.city).toBeTruthy();
        expect(row.country).toBeTruthy();
        expect(Number.isFinite(row.latitude)).toBe(true);
        expect(Number.isFinite(row.longitude)).toBe(true);
        expect(row.status).toBe("published");
        expect(row.created_at).toBe(row.published_at);
        expect(row).not.toHaveProperty("id");
      }
    }
    expect(getLegacyJobBatch(5100)).toHaveLength(47);
  });

  it("rejects offsets that skip or repeat part of a batch", () => {
    expect(getLegacyJobBatch(-100)).toBeNull();
    expect(getLegacyJobBatch(1)).toBeNull();
    expect(getLegacyJobBatch(LEGACY_JOB_COUNT)).toBeNull();
    expect(getLegacyJobBatch(Number.NaN)).toBeNull();
  });
});
