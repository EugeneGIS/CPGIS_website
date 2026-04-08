import { isBefore, parseISO } from "date-fns";
import type {
  DashboardMetrics,
  JobFilters,
  JobRecord,
  MapBounds,
  MonthlyBucket,
} from "@/lib/types";

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

export function buildMonthlyBuckets(jobs: JobRecord[]): MonthlyBucket[] {
  const groups = new Map<string, number>();

  for (const job of jobs) {
    const rawDate = job.sourceDate ?? job.createdAt.slice(0, 10);
    const key = rawDate.slice(0, 7);
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({
      label,
      value,
    }));
}
