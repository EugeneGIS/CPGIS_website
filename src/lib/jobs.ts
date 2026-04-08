import { demoJobs } from "@/lib/mock-data";
import type { JobRecord } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function mapSupabaseRowToJob(row: Record<string, unknown>): JobRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    organization: String(row.organization),
    department: row.department ? String(row.department) : undefined,
    summary: String(row.summary),
    description: row.description ? String(row.description) : undefined,
    applicationUrl: String(row.application_url),
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
    location: {
      label: [row.city, row.country].filter(Boolean).join(", "),
      address: row.address ? String(row.address) : undefined,
      city: String(row.city ?? ""),
      country: String(row.country ?? ""),
      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),
    },
  };
}

export async function getPublishedJobs() {
  if (!isSupabaseConfigured()) {
    return demoJobs;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      return demoJobs;
    }

    return data.map((row) => mapSupabaseRowToJob(row));
  } catch {
    return demoJobs;
  }
}

export async function getAdminJobs() {
  if (!isSupabaseConfigured()) {
    return [...demoJobs].sort((left, right) =>
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
  const jobs = await getPublishedJobs();
  return jobs.find((job) => job.slug === slug) ?? null;
}
