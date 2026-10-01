import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { parseCpgisCsv } from "@/lib/cpgis-csv";
import { env, isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !env.supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Persistent CSV import requires Supabase configuration." }, { status: 503 });
  }
  try {
    const session = await getSessionContext();
    if (!session.user || session.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
    }
    if (!file.size || file.size > MAX_CSV_BYTES) {
      return NextResponse.json({ error: "CSV must be between 1 byte and 5 MB." }, { status: 413 });
    }
    const report = parseCpgisCsv(await file.text());
    const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const records = report.candidates.map((candidate) => ({
      source_id: candidate.sourceId,
      posted_at: candidate.postedAt.replace(" ", "T") + "Z",
      raw_text: candidate.rawText,
      extracted: candidate,
      source_file: file.name,
    }));
    let imported = 0;
    for (let i = 0; i < records.length; i += 100) {
      const { data, error } = await supabase.from("cpgis_csv_imports")
        .upsert(records.slice(i, i + 100), { onConflict: "source_id", ignoreDuplicates: true })
        .select("source_id");
      if (error) throw new Error(error.message);
      imported += data?.length ?? 0;
    }
    return NextResponse.json({ total: report.total, candidates: report.candidates.length, skipped: report.skipped, imported, existing: report.candidates.length - imported });
  } catch (error) {
    console.error("CSV import failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "CSV import failed." }, { status: 422 });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured() || !env.supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Persistent CSV import requires Supabase configuration." }, { status: 503 });
  }
  const session = await getSessionContext();
  if (!session.user || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  let input: { sourceId?: string; status?: string };
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!/^\d{8,25}$/.test(input.sourceId ?? "") || !["reviewed", "ignored"].includes(input.status ?? "")) {
    return NextResponse.json({ error: "Invalid source ID or status." }, { status: 400 });
  }
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  const { error } = await supabase.from("cpgis_csv_imports")
    .update({ review_status: input.status })
    .eq("source_id", input.sourceId);
  if (error) return NextResponse.json({ error: "Could not update review status." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
