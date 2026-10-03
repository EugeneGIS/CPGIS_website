import { addDays, isBefore, parseISO } from "date-fns";
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

  const width = ((bounds.east - bounds.west) % 360 + 360) % 360;
  const fullWorld = Math.abs(bounds.east - bounds.west) >= 360;
  const normalize = (longitude: number) => ((longitude % 360) + 360) % 360;
  const west = normalize(bounds.west);
  const longitude = normalize(job.location.longitude);
  const offset = ((longitude - west) + 360) % 360;

  return job.location.latitude <= bounds.north &&
    job.location.latitude >= bounds.south &&
    (fullWorld || offset <= width);
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

/** Fallback for open-until-filled posts without a usable appointment date. */
export const ROLLING_POST_TTL_DAYS = 60;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function calendarDate(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 &&
    date.getDate() === day ? toDateKey(date) : null;
}

export function appointmentStartDate(job: JobRecord): string | null {
  const text = [job.deadlineText, job.description, job.summary].filter(Boolean).join(" ");
  const clause = text.match(/\bappointment\s+(?:starts?|begins?)\s+(?:on|in|at)\s+([^).;\n]+)/i)?.[1];
  if (!clause) return null;

  const iso = clause.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayMonth = clause.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(20\d{2})\b/i);
  if (dayMonth) {
    const month = MONTHS[dayMonth[2].toLowerCase()];
    return month ? calendarDate(Number(dayMonth[3]), month, Number(dayMonth[1])) : null;
  }

  const monthDay = clause.match(/\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i);
  if (monthDay) {
    const month = MONTHS[monthDay[1].toLowerCase()];
    return month ? calendarDate(Number(monthDay[3]), month, Number(monthDay[2])) : null;
  }

  if (/[A-Za-z]+\s*(?:\/|\bor\b|\bto\b)\s*[A-Za-z]+\s+20\d{2}/i.test(clause)) return null;
  const monthYear = clause.match(/\b([A-Za-z]+)\s+(20\d{2})\b/i);
  if (!monthYear) return null;
  const month = MONTHS[monthYear[1].toLowerCase()];
  return month ? toDateKey(new Date(Number(monthYear[2]), month, 0)) : null;
}

export function rollingExpiryDate(job: JobRecord): string {
  const startDate = appointmentStartDate(job);
  if (startDate) return startDate;
  const publishedAt = job.sourceDate ?? job.createdAt.slice(0, 10);
  return toDateKey(addDays(parseISO(publishedAt), ROLLING_POST_TTL_DAYS));
}

/**
 * Deadlines are inclusive: a job stays valid through its apply-by day, and a
 * rolling post through its stated appointment start or 60th publication day. Expired
 * records stay in the database (shared links must keep resolving) but drop out
 * of every active view. All comparisons are calendar dates.
 */
export function isJobExpired(job: JobRecord, today: string): boolean {
  if (job.applyBy) {
    return today > job.applyBy;
  }

  return today > rollingExpiryDate(job);
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
  /** "Open until filled" records valid through their start date or fallback window. */
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
