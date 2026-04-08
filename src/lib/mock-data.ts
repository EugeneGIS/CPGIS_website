import type { JobRecord } from "@/lib/types";
import jobs from "@/data/cpgis-jobs.json";

export const demoJobs: JobRecord[] = jobs.map((job) => ({
  ...job,
  contactEmail: job.contactEmail ?? undefined,
  applyBy: job.applyBy ?? undefined,
  description: job.description ?? undefined,
  sourceDate: job.sourceDate ?? undefined,
  importSource: job.importSource ?? undefined,
  createdBy: job.createdBy ?? undefined,
  status: job.status as JobRecord["status"],
  location: {
    ...job.location,
    address: job.location.address ?? undefined,
  },
}));
