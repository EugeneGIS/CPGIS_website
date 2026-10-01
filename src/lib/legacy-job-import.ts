import { demoJobs } from "@/lib/mock-data";
import type { JobRecord } from "@/lib/types";

export const LEGACY_JOB_BATCH_SIZE = 100;
export const LEGACY_JOB_COUNT = demoJobs.length;

export function legacyJobRow(job: JobRecord) {
  return {
    slug: job.slug,
    title: job.title,
    organization: job.organization,
    department: job.department ?? null,
    summary: job.summary,
    description: job.description ?? null,
    application_url: job.applicationUrl,
    contact_email: job.contactEmail ?? null,
    city: job.location.city,
    country: job.location.country,
    address: job.location.address ?? null,
    latitude: job.location.latitude,
    longitude: job.location.longitude,
    apply_by: job.applyBy ?? null,
    deadline_text: job.deadlineText,
    source_date: job.sourceDate ?? null,
    import_source: job.importSource ?? "cpgis-docx",
    tags: job.tags,
    status: "published" as const,
    published_at: job.createdAt,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

export function getLegacyJobBatch(offset: number) {
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset >= LEGACY_JOB_COUNT ||
    offset % LEGACY_JOB_BATCH_SIZE !== 0
  ) {
    return null;
  }

  return demoJobs
    .slice(offset, offset + LEGACY_JOB_BATCH_SIZE)
    .map(legacyJobRow);
}
