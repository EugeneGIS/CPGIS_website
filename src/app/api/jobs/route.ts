import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { addDemoJob } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createJobSlug } from "@/lib/job-identity";
import { submitJobSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function errorResponse(
  code: string,
  error: string,
  status: number,
  issues?: Array<{ path: string; message: string }>,
) {
  return NextResponse.json(
    {
      code,
      error,
      ...(issues ? { issues } : {}),
    },
    { status },
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      "MALFORMED_JSON",
      "The request body must contain valid JSON.",
      400,
    );
  }

  const parsed = submitJobSchema.safeParse(payload);

  if (!parsed.success) {
    const issues = Array.from(
      new Map(
        parsed.error.issues.map((issue) => {
          const path = issue.path.map(String).join(".");
          return [
            `${path}\u0000${issue.message}`,
            { path, message: issue.message },
          ];
        }),
      ).values(),
    );

    return errorResponse(
      "VALIDATION_FAILED",
      "The job submission contains invalid fields.",
      400,
      issues,
    );
  }

  const job = parsed.data;
  const slug = createJobSlug({
    organization: job.organization,
    title: job.title,
    applicationUrl: job.applicationUrl,
  });

  if (!isSupabaseConfigured()) {
    // Dev-only queue so the review workflow is clickable without Supabase.
    const createdAt = new Date().toISOString();
    addDemoJob({
      id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      slug,
      title: job.title,
      organization: job.organization,
      department: job.department || undefined,
      summary: job.summary,
      description: job.description || undefined,
      applicationUrl: job.applicationUrl,
      contactEmail: job.contactEmail || undefined,
      applyBy: job.applyBy || undefined,
      deadlineText:
        job.deadlineText ||
        (job.applyBy ? `Apply by ${job.applyBy}` : "Open until filled"),
      status: job.status,
      sourceDate: createdAt.slice(0, 10),
      importSource: job.importSource,
      tags: job.tags,
      createdAt,
      updatedAt: createdAt,
      location: {
        label: [job.city, job.country].filter(Boolean).join(", "),
        address: job.address || undefined,
        city: job.city,
        country: job.country,
        latitude: job.latitude,
        longitude: job.longitude,
      },
    });

    return NextResponse.json({
      message:
        job.status === "draft"
          ? "Draft saved to the in-memory demo queue (resets on server restart)."
          : "Submitted to the in-memory demo queue (resets on server restart) — open /admin to review it.",
      job: {
        ...job,
        slug,
      },
    });
  }

  let session;

  try {
    session = await getSessionContext();
  } catch (error) {
    console.error("Could not verify job submission access.", error);
    return errorResponse(
      "AUTH_CHECK_FAILED",
      "Could not verify submission access. Try again later.",
      503,
    );
  }

  if (!session.user) {
    return errorResponse(
      "AUTH_REQUIRED",
      "Sign in before submitting a new opportunity.",
      401,
    );
  }

  try {
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
        job.deadlineText ||
        (job.applyBy ? `Apply by ${job.applyBy}` : "Open until filled"),
      tags: job.tags,
      status: job.status,
      import_source: job.importSource,
      source_date: new Date().toISOString().slice(0, 10),
      created_by: session.user.id,
    });

    if (error) {
      console.error("Could not persist job submission.", error);
      return errorResponse(
        "SUBMISSION_FAILED",
        "Could not save the job submission. Try again later.",
        500,
      );
    }
  } catch (error) {
    console.error("Could not persist job submission.", error);
    return errorResponse(
      "SUBMISSION_FAILED",
      "Could not save the job submission. Try again later.",
      500,
    );
  }

  return NextResponse.json({
    message:
      job.status === "draft"
        ? "Draft saved. It will not appear publicly until it is submitted and approved."
        : "Job submitted for admin review.",
  });
}
