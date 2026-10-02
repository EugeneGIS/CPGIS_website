import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { getPublicAppOrigin } from "@/lib/job-share";
import { getActivePublishedJobs, getPublishedJobs } from "@/lib/jobs";
import { mapShareInputSchema, mapShareSearch, selectMapShareJobs } from "@/lib/map-share";
import { mapPreviewPath } from "@/lib/map-preview-url";
import { toDateKey } from "@/lib/utils";

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 2048) return NextResponse.json({ error: "Share request is too large." }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "Invalid share request." }, { status: 400 });
  }
  const parsed = mapShareInputSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid map bounds or filters." }, { status: 400 });

  try {
    const createdAt = new Date().toISOString();
    const today = toDateKey(new Date());
    const candidates = parsed.data.includeExpired
      ? await getPublishedJobs()
      : await getActivePublishedJobs(today);
    const jobs = selectMapShareJobs(candidates, parsed.data, today);
    const origin = getPublicAppOrigin(env.appUrl);
    let suffix = mapShareSearch(parsed.data, createdAt);
    let persisted = false;

    if (isSupabaseConfigured() && env.supabaseServiceRoleKey) {
      const id = randomUUID();
      const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await supabase.from("map_shares").insert({
        id,
        bounds: parsed.data.bounds,
        query: parsed.data.query,
        include_expired: parsed.data.includeExpired,
        theme: parsed.data.theme,
        job_ids: jobs.map((job) => job.id),
        created_at: createdAt,
      });
      if (error) throw new Error(error.message);
      suffix = `s=${id}`;
      persisted = true;
    }

    return NextResponse.json({
      url: `${origin}/map-share?${suffix}`,
      imageUrl: `${origin}${mapPreviewPath(suffix)}`,
      previewPath: `/map-share?${suffix}`,
      count: jobs.length,
      persisted,
    });
  } catch (error) {
    console.error("Could not create map share.", error);
    return NextResponse.json({ error: "Could not create the map share." }, { status: 500 });
  }
}
