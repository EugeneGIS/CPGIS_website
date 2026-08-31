import { addMonths, isBefore, parseISO } from "date-fns";
import type {
  DashboardMetrics,
  JobFilters,
  JobRecord,
  MapBounds,
  MonthlyBucket,
} from "@/lib/types";
import { toDateKey } from "@/lib/utils";

function withinBounds(job: JobRecord, bounds: MapBounds | null) {
  if (!bounds) {
    return true;
  }

  return (
    job.location.latitude <= bounds.north &&
    job.location.latitude >= bounds.south &&
    job.location.longitude <= bounds.east &&
    job.location.longitude >= bounds.west
  );
}

export function filterJobs(jobs: JobRecord[], filters: JobFilters) {
  const query = filters.query.trim().toLowerCase();

  return jobs.filter((job) => {
    const matchesBounds = !filters.limitToViewport || withinBounds(job, filters.bounds);
    if (!matchesBounds) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      job.title,
      job.organization,
      job.summary,
      job.location.city,
      job.location.country,
      ...job.tags,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function buildDashboardMetrics(allJobs: JobRecord[], visibleJobs: JobRecord[]) {
  const now = new Date();
  const cities = new Set(visibleJobs.map((job) => job.location.city));
  const countries = new Set(visibleJobs.map((job) => job.location.country));
  const upcomingDeadlines = visibleJobs.filter((job) => {
    if (!job.applyBy) {
      return false;
    }

    return !isBefore(parseISO(job.applyBy), now);
  }).length;

  const metrics: DashboardMetrics = {
    total: allJobs.length,
    visible: visibleJobs.length,
    cities: cities.size,
    countries: countries.size,
    upcomingDeadlines,
  };

  return metrics;
}

/** Rolling "open until filled" posts stay listed for two months after publication. */
export const ROLLING_POST_TTL_MONTHS = 2;

function addMonthsToKey(dateKey: string, months: number): string {
  const shifted = addMonths(parseISO(dateKey), months);
  return toDateKey(shifted);
}

/**
 * Deadlines are inclusive: a job stays valid through its apply-by day, and a
 * rolling post through the two-month anniversary of its publication. Expired
 * records stay in the database (shared links must keep resolving) but drop out
 * of every active view. All comparisons are calendar dates.
 */
export function isJobExpired(job: JobRecord, today: string): boolean {
  if (job.applyBy) {
    return today > job.applyBy;
  }

  const publishedAt = job.sourceDate ?? job.createdAt.slice(0, 10);
  return today > addMonthsToKey(publishedAt, ROLLING_POST_TTL_MONTHS);
}

function compareDeadlineAsc(left: JobRecord, right: JobRecord) {
  return (left.applyBy ?? "9999-12-31").localeCompare(
    right.applyBy ?? "9999-12-31",
  );
}

export interface PlanAheadData {
  currentMonth: string;
  /** Current and future months, counting only records whose deadline has not passed. */
  upcoming: MonthlyBucket[];
  /** Historical months before the current one, counting every past deadline. */
  past: MonthlyBucket[];
  jobsByMonth: Record<string, JobRecord[]>;
  /** "Open until filled" records still inside the two-month publication window. */
  rolling: JobRecord[];
}

export function buildPlanAheadData(
  jobs: JobRecord[],
  today: string,
): PlanAheadData {
  const currentMonth = today.slice(0, 7);
  const activeCounts = new Map<string, number>();
  const historicalCounts = new Map<string, number>();
  const grouped = new Map<string, JobRecord[]>();
  const rolling: JobRecord[] = [];

  for (const job of jobs) {
    if (!job.applyBy) {
      if (!isJobExpired(job, today)) {
        rolling.push(job);
      }
      continue;
    }

    const month = job.applyBy.slice(0, 7);
    const list = grouped.get(month);

    if (list) {
      list.push(job);
    } else {
      grouped.set(month, [job]);
    }

    historicalCounts.set(month, (historicalCounts.get(month) ?? 0) + 1);

    if (month >= currentMonth && !isJobExpired(job, today)) {
      activeCounts.set(month, (activeCounts.get(month) ?? 0) + 1);
    }
  }

  const toBuckets = (counts: Map<string, number>): MonthlyBucket[] =>
    [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, value]) => ({ label, value }));

  for (const list of grouped.values()) {
    list.sort(compareDeadlineAsc);
  }

  rolling.sort((left, right) =>
    (right.sourceDate ?? right.createdAt.slice(0, 10)).localeCompare(
      left.sourceDate ?? left.createdAt.slice(0, 10),
    ),
  );

  return {
    currentMonth,
    upcoming: toBuckets(activeCounts),
    past: toBuckets(historicalCounts).filter(
      (bucket) => bucket.label < currentMonth,
    ),
    jobsByMonth: Object.fromEntries(grouped),
    rolling,
  };
}
