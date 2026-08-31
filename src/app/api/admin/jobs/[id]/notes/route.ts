import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { addDemoNote, getDemoNotes } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const noteSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ notes: getDemoNotes(id) });
  }

  const session = await getSessionContext();

  if (session.role !== "admin" || !session.user) {
    return NextResponse.json(
      { error: "Admin access is required to read review notes." },
      { status: 403 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("job_review_notes")
    .select("id, job_id, author_email, body, created_at")
    .eq("job_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload = noteSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "A review note must contain 1-2000 characters." },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    const note = addDemoNote(id, payload.data.body, "demo-reviewer@localhost");

    return NextResponse.json({ note });
  }

  const session = await getSessionContext();

  if (!session.user) {
    return NextResponse.json(
      { error: "Sign in before writing review notes." },
      { status: 401 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("job_review_notes")
    .insert({
      job_id: id,
      author_id: session.user.id,
      author_email: session.user.email ?? null,
      body: payload.data.body,
    })
    .select("id, job_id, author_email, body, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}
