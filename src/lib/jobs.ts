import type { JobRecord, JobStatus } from "@/lib/types";
import {
  findDemoJobBySlug,
  getDemoJobs,
  getPublishedDemoJobs,
} from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createJobSlug } from "@/lib/job-identity";
import { normalizeLocationDisplay } from "@/lib/location-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import legacyJobSlugs from "@/data/legacy-job-slug-redirects.json";
import { subMonths } from "date-fns";
import { isJobExpired } from "@/lib/job-filters";
import { toDateKey } from "@/lib/utils";

const legacySlugRedirects = legacyJobSlugs.redirects as Record<string, string>;
const ambiguousLegacySlugs = new Set<string>(legacyJobSlugs.ambiguous);
const canonicalToLegacySlugs = legacyJobSlugs.canonicalToLegacy as Record<
  string,
  string
>;

export function mapSupabaseRowToJob(row: Record<string, unknown>): JobRecord {
  const title = String(row.title);
  const organization = String(row.organization);
  const applicationUrl = String(row.application_url);
  const storedSlug = String(row.slug);
  const computedSlug = createJobSlug({ title, organization, applicationUrl });
  const slugIsKnownIdentity =
    storedSlug === computedSlug ||
    canonicalToLegacySlugs[computedSlug] === storedSlug;

  return {
    id: String(row.id),
    slug: slugIsKnownIdentity ? computedSlug : storedSlug,
    title,
    organization,
    department: row.department ? String(row.department) : undefined,
    summary: String(row.summary),
    description: row.description ? String(row.description) : undefined,
    applicationUrl,
    contactEmail: row.contact_email ? String(row.contact_email) : undefined,
    applyBy: row.apply_by ? String(row.apply_by).slice(0, 10) : undefined,
    deadlineText: row.deadline_text ? String(row.deadline_text) : "Open until filled",
    status: row.status as JobRecord["status"],
    sourceDate: row.source_date ? String(row.source_date) : undefined,
    importSource: row.import_source ? String(row.import_source) : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)) : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    createdBy: row.created_by ? String(row.created_by) : undefined,
    facebookPostedAt: row.facebook_posted_at
      ? String(row.facebook_posted_at)
      : undefined,
    xPostedAt: row.x_posted_at ? String(row.x_posted_at) : undefined,
    location: normalizeLocationDisplay({
      label: [row.city, row.country].filter(Boolean).join(", "),
      address: row.address ? String(row.address) : undefined,
      city: String(row.city ?? ""),
      country: String(row.country ?? ""),
      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),
    }),
  };
}

export async function getPublishedJobs() {
  if (!isSupabaseConfigured()) {
    const { demoJobs } = await import("@/lib/mock-data");
    return [...getPublishedDemoJobs(), ...demoJobs];
  }

  const supabase = await createServerSupabaseClient();
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows.map((row) => mapSupabaseRowToJob(row));
}

/** Keep the public map's initial query small; the wider date window is
 * narrowed by the exact calendar-day expiry rule after fetching. */
export async function getActivePublishedJobs(today: string) {
  if (!isSupabaseConfigured()) {
    return (await getPublishedJobs()).filter((job) => !isJobExpired(job, today));
  }

  const supabase = await createServerSupabaseClient();
  const cutoff = toDateKey(subMonths(new Date(`${today}T12:00:00Z`), 3));
  const candidateFilter = [
    `apply_by.gte.${today}`,
    `and(apply_by.is.null,source_date.gte.${cutoff})`,
    `and(apply_by.is.null,source_date.is.null,created_at.gte.${cutoff}T00:00:00Z)`,
  ].join(",");
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("job_posts")
      .select("id,slug,title,organization,department,summary,application_url,city,country,address,latitude,longitude,apply_by,deadline_text,source_date,import_source,tags,created_at,updated_at")
      .eq("status", "published")
      .or(candidateFilter)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows.map(mapSupabaseRowToJob).filter((job) => !isJobExpired(job, today));
}

export async function getPublishedJobCount() {
  if (!isSupabaseConfigured()) return (await getPublishedJobs()).length;
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getPastDeadlineCount(currentMonth: string) {
  if (!isSupabaseConfigured()) {
    return (await getPublishedJobs()).filter((job) => job.applyBy && job.applyBy < `${currentMonth}-01`).length;
  }
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase.from("job_posts")
    .select("id", { head: true, count: "exact" })
    .eq("status", "published")
    .lt("apply_by", `${currentMonth}-01`);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getPublishedJobsByIds(ids: string[]) {
  if (!ids.length) return [];
  if (!isSupabaseConfigured()) {
    const wanted = new Set(ids);
    return (await getPublishedJobs()).filter((job) => wanted.has(job.id));
  }

  const supabase = await createServerSupabaseClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; from < ids.length; from += 100) {
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("status", "published")
      .in("id", ids.slice(from, from + 100));
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows.map(mapSupabaseRowToJob);
}

export async function getAdminJobs() {
  if (!isSupabaseConfigured()) {
    const { demoJobs } = await import("@/lib/mock-data");
    return [...getDemoJobs(), ...demoJobs].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  const supabase = await createServerSupabaseClient();
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows.map((row) => mapSupabaseRowToJob(row));
}

export type AdminJobFilter = JobStatus | "all" | "expired";
export const ADMIN_JOB_PAGE_SIZE = 25;

export async function getAdminJobCounts() {
  const statuses: JobStatus[] = ["pending", "needs_changes", "approved", "draft", "published", "archived"];
  if (!isSupabaseConfigured()) {
    const jobs = await getAdminJobs();
    const counts = Object.fromEntries(statuses.map((status) => [status, jobs.filter((job) => job.status === status).length]));
    return { ...counts, all: jobs.length } as Record<JobStatus | "all", number>;
  }

  const supabase = await createServerSupabaseClient();
  const results = await Promise.all(statuses.map(async (status) => {
    const { count, error } = await supabase.from("job_posts")
      .select("id", { head: true, count: "exact" }).eq("status", status);
    if (error) throw new Error(error.message);
    return [status, count ?? 0] as const;
  }));
  const counts = Object.fromEntries(results) as Record<JobStatus, number>;
  return { ...counts, all: Object.values(counts).reduce((sum, value) => sum + value, 0) };
}

export async function getAdminJobPage({
  status, query, page, today,
}: {
  status: AdminJobFilter;
  query: string;
  page: number;
  today: string;
}) {
  const safePage = Math.max(0, Math.min(Math.floor(page), 10000));
  const cleanQuery = query.trim().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const matchesQuery = (job: JobRecord) => [job.title, job.organization, job.location.city, job.location.country, ...job.tags]
    .join(" ").toLowerCase().includes(cleanQuery.toLowerCase());

  if (!isSupabaseConfigured() || status === "expired") {
    const allJobs = await getAdminJobs();
    const jobs = allJobs.filter((job) =>
      (status === "all" || status === "expired" || job.status === status) &&
      (status !== "expired" || isJobExpired(job, today)) && matchesQuery(job));
    const pageJobs = jobs.slice(safePage * ADMIN_JOB_PAGE_SIZE, (safePage + 1) * ADMIN_JOB_PAGE_SIZE);
    const duplicateCounts = Object.fromEntries(pageJobs.map((job) => [
      job.applicationUrl, allJobs.filter((candidate) => candidate.applicationUrl === job.applicationUrl).length,
    ]));
    return { jobs: pageJobs, total: jobs.length, duplicateCounts };
  }

  const supabase = await createServerSupabaseClient();
  let request = supabase.from("job_posts").select("*", { count: "exact" });
  if (status !== "all") request = request.eq("status", status);
  if (cleanQuery) {
    const pattern = `%${cleanQuery}%`;
    request = request.or(`title.ilike.${pattern},organization.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern}`);
  }
  const { data, count, error } = await request.order("updated_at", { ascending: false })
    .range(safePage * ADMIN_JOB_PAGE_SIZE, (safePage + 1) * ADMIN_JOB_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const jobs = (data ?? []).map(mapSupabaseRowToJob);
  const urls = [...new Set(jobs.map((job) => job.applicationUrl))];
  const duplicateCounts: Record<string, number> = {};
  if (urls.length) {
    for (let from = 0; ; from += 1000) {
      const { data: matches, error: matchError } = await supabase.from("job_posts")
        .select("application_url")
        .in("application_url", urls)
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (matchError) throw new Error(matchError.message);
      for (const row of matches ?? []) {
        duplicateCounts[row.application_url] = (duplicateCounts[row.application_url] ?? 0) + 1;
      }
      if (!matches || matches.length < 1000) break;
    }
  }
  return { jobs, total: count ?? 0, duplicateCounts };
}

export async function getJobBySlug(slug: string) {
  if (ambiguousLegacySlugs.has(slug)) {
    return null;
  }

  const canonicalSlug = legacySlugRedirects[slug] ?? slug;

  if (!isSupabaseConfigured()) {
    const { demoJobs } = await import("@/lib/mock-data");
    return (
      findDemoJobBySlug(canonicalSlug) ??
      demoJobs.find((job) => job.slug === canonicalSlug) ??
      null
    );
  }

  const supabase = await createServerSupabaseClient();
  const getVerifiedPublishedRow = async (storedSlug: string) => {
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("slug", storedSlug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const job = mapSupabaseRowToJob(data);
    return job.slug === canonicalSlug ? job : null;
  };

  const directMatch = await getVerifiedPublishedRow(canonicalSlug);

  if (directMatch) {
    return directMatch;
  }

  const legacySlug = canonicalToLegacySlugs[canonicalSlug];
  return legacySlug && legacySlug !== canonicalSlug
    ? await getVerifiedPublishedRow(legacySlug)
    : null;
}
