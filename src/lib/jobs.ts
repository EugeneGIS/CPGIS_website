import { demoJobs } from "@/lib/mock-data";
import type { JobRecord } from "@/lib/types";
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
    return [...getPublishedDemoJobs(), ...demoJobs];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("job_posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapSupabaseRowToJob(row));
}

export async function getAdminJobs() {
  if (!isSupabaseConfigured()) {
    return [...getDemoJobs(), ...demoJobs].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("job_posts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapSupabaseRowToJob(row));
}

export async function getJobBySlug(slug: string) {
  if (ambiguousLegacySlugs.has(slug)) {
    return null;
  }

  const canonicalSlug = legacySlugRedirects[slug] ?? slug;

  if (!isSupabaseConfigured()) {
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
