import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { submitJobSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = submitJobSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission." },
      { status: 400 },
    );
  }

  const job = parsed.data;
  const slug = slugify(`${job.organization}-${job.title}`);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      message:
        "Demo mode: the job payload validated successfully. Connect Supabase to persist it.",
      job: {
        ...job,
        slug,
      },
    });
  }

  const session = await getSessionContext();

  if (!session.user) {
    return NextResponse.json(
      { error: "Sign in before submitting a new opportunity." },
      { status: 401 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("job_posts").insert({
    slug,
    title: job.title,
    organization: job.organization,
    department: job.department || null,
    summary: job.summary,
    description: job.description || null,
    application_url: job.applicationUrl,
    contact_email: job.contactEmail || null,
    city: job.city,
    country: job.country,
    address: job.address || null,
    latitude: job.latitude,
    longitude: job.longitude,
    apply_by: job.applyBy || null,
    deadline_text:
      job.deadlineText || (job.applyBy ? `Apply by ${job.applyBy}` : "Open until filled"),
    tags: job.tags,
    status: "pending",
    import_source: job.importSource,
    created_by: session.user.id,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Job submitted for admin review.",
  });
}
