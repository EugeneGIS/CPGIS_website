import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import {
  setDemoSocialFlag,
  updateDemoJobStatus,
} from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const moderationSchema = z.object({
  status: z
    .enum(["draft", "pending", "needs_changes", "approved", "published", "archived"])
    .optional(),
  facebookPostedAt: z.string().datetime().nullable().optional(),
  xPostedAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return patchDemo(request, context);
  }

  const session = await getSessionContext();

  if (session.role !== "admin" || !session.user) {
    return NextResponse.json(
      { error: "Admin access is required for moderation actions." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const payload = moderationSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid moderation payload." },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};

  if (payload.data.status) {
    updates.status = payload.data.status;
    updates.published_at =
      payload.data.status === "published" ? new Date().toISOString() : null;
  }

  if (payload.data.facebookPostedAt !== undefined) {
    updates.facebook_posted_at = payload.data.facebookPostedAt;
  }

  if (payload.data.xPostedAt !== undefined) {
    updates.x_posted_at = payload.data.xPostedAt;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update; pass a status or a social posting flag." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("job_posts")
    .update(updates)
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/admin");

  if (data?.slug) {
    revalidatePath(`/jobs/${data.slug}`);
  }

  const summary =
    typeof updates.status === "string"
      ? `Job status updated to ${updates.status}.`
      : "Social posting flag updated.";

  return NextResponse.json({ message: summary });
}

async function patchDemo(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload = moderationSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid moderation payload." },
      { status: 400 },
    );
  }

  let touched = false;

  if (payload.data.status) {
    touched =
      updateDemoJobStatus(id, payload.data.status) !== null || touched;
  }

  if (payload.data.facebookPostedAt !== undefined) {
    touched =
      setDemoSocialFlag(id, "facebook", payload.data.facebookPostedAt) !==
        null || touched;
  }

  if (payload.data.xPostedAt !== undefined) {
    touched =
      setDemoSocialFlag(id, "x", payload.data.xPostedAt) !== null || touched;
  }

  if (!touched) {
    return NextResponse.json(
      {
        error:
          "This record is not in the in-memory demo queue (bundled demo records are read-only).",
      },
      { status: 400 },
    );
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({
    message: payload.data.status
      ? `Demo queue: status updated to ${payload.data.status}.`
      : "Demo queue: social posting flag updated.",
  });
}
