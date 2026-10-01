import { getPublishedJobs } from "@/lib/jobs";
import { isSupabaseConfigured } from "@/lib/env";
import { selectMapShareJobs, parseMapShareSearch, mapShareInputSchema } from "@/lib/map-share";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { JobRecord } from "@/lib/types";
import { toDateKey } from "@/lib/utils";

export interface MapShareView {
  jobs: JobRecord[];
  input: ReturnType<typeof mapShareInputSchema.parse>;
  createdAt: string;
  persisted: boolean;
}

export async function getMapShareView(search: URLSearchParams): Promise<MapShareView | null> {
  const id = search.get("s");
  const allJobs = await getPublishedJobs();
  if (id) {
    if (!isSupabaseConfigured()) return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("map_shares").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    const parsed = mapShareInputSchema.safeParse({
      bounds: data.bounds,
      query: data.query,
      includeExpired: data.include_expired,
      theme: data.theme,
    });
    if (!parsed.success) return null;
    const jobsById = new Map(allJobs.map((job) => [job.id, job]));
    const ids: string[] = Array.isArray(data.job_ids) ? data.job_ids.map(String) : [];
    const jobs = ids.map((jobId: string) => jobsById.get(jobId)).filter((job: JobRecord | undefined): job is JobRecord => Boolean(job));
    return { jobs, input: parsed.data, createdAt: String(data.created_at), persisted: true };
  }

  const parsed = parseMapShareSearch(search);
  if (!parsed) return null;
  return {
    jobs: selectMapShareJobs(allJobs, parsed.input, toDateKey(new Date())),
    input: parsed.input,
    createdAt: parsed.createdAt,
    persisted: false,
  };
}
