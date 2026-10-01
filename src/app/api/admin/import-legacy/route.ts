import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {
  getLegacyJobBatch,
  LEGACY_JOB_BATCH_SIZE,
  LEGACY_JOB_COUNT,
} from "@/lib/legacy-job-import";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session.user || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin import is not allowed." }, { status: 403 });
  }

  let rawOffset: unknown;
  try {
    ({ offset: rawOffset } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const offset = typeof rawOffset === "number" ? rawOffset : NaN;
  const batch = getLegacyJobBatch(offset);
  if (!batch) {
    return NextResponse.json({ error: "Invalid batch offset." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("job_posts")
    .upsert(batch, { onConflict: "slug", ignoreDuplicates: true })
    .select("slug");

  if (error) {
    console.error("Legacy job import failed", error);
    return NextResponse.json({ error: "Could not import this batch." }, { status: 500 });
  }

  return NextResponse.json({
    total: LEGACY_JOB_COUNT,
    batchSize: LEGACY_JOB_BATCH_SIZE,
    processed: batch.length,
    inserted: data?.length ?? 0,
    existing: batch.length - (data?.length ?? 0),
    nextOffset: Math.min(offset + batch.length, LEGACY_JOB_COUNT),
  });
}
