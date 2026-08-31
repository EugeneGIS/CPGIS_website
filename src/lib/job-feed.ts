import type { JobRecord } from "@/lib/types";

export const JOB_FEED_BATCH_SIZE = 5;

function publicationDate(job: JobRecord) {
  return job.sourceDate ?? job.createdAt.slice(0, 10);
}

export function sortJobsForFeed(
  jobs: JobRecord[],
  selectedJobId?: string,
) {
  return [...jobs].sort((left, right) => {
    if (left.id === selectedJobId) {
      return -1;
    }

    if (right.id === selectedJobId) {
      return 1;
    }

    const dateOrder = publicationDate(right).localeCompare(
      publicationDate(left),
    );

    return dateOrder || left.id.localeCompare(right.id);
  });
}

export function nextJobFeedCount(
  currentCount: number,
  totalCount: number,
  batchSize = JOB_FEED_BATCH_SIZE,
) {
  return Math.min(totalCount, currentCount + batchSize);
}
