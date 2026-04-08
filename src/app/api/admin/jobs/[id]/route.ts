import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusSchema = z.object({
  status: z.enum(["draft", "pending", "published", "archived"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Demo mode does not persist moderation changes. Connect Supabase to enable the real admin backend.",
      },
      { status: 400 },
    );
  }

  const session = await getSessionContext();

  if (session.role !== "admin" || !session.user) {
    return NextResponse.json(
      { error: "Admin access is required for moderation actions." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const payload = statusSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid moderation payload." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const nextStatus = payload.data.status;
  const { data, error } = await supabase
    .from("job_posts")
    .update({
      status: nextStatus,
      published_at: nextStatus === "published" ? new Date().toISOString() : null,
    })
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

  return NextResponse.json({
    message: `Job status updated to ${nextStatus}.`,
  });
}
