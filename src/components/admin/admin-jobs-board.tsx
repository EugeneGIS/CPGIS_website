"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { JobRecord, JobStatus, SessionContext } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

const STATUSES: JobStatus[] = ["pending", "published", "archived", "draft"];

function nextActionsForStatus(status: JobStatus) {
  if (status === "pending") {
    return ["published", "archived", "draft"] as const;
  }

  if (status === "published") {
    return ["archived", "pending"] as const;
  }

  if (status === "archived") {
    return ["published", "pending"] as const;
  }

  return ["pending", "published", "archived"] as const;
}

function statusLabel(status: JobStatus) {
  if (status === "pending") {
    return "Pending review";
  }

  if (status === "published") {
    return "Published";
  }

  if (status === "archived") {
    return "Archived";
  }

  return "Draft";
}

export function AdminJobsBoard({
  jobs,
  session,
}: {
  jobs: JobRecord[];
  session: SessionContext;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<JobStatus | "all">(
    jobs.some((job) => job.status === "pending") ? "pending" : "all",
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const statusCounts = useMemo(() => {
    return STATUSES.reduce(
      (counts, status) => ({
        ...counts,
        [status]: jobs.filter((job) => job.status === status).length,
      }),
      {} as Record<JobStatus, number>,
    );
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesStatus = activeStatus === "all" || job.status === activeStatus;
      if (!matchesStatus) {
        return false;
      }

      if (!loweredQuery) {
        return true;
      }

      return [
        job.title,
        job.organization,
        job.location.city,
        job.location.country,
        ...job.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(loweredQuery);
    });
  }, [activeStatus, jobs, query]);

  function updateStatus(jobId: string, status: JobStatus) {
    setMessage("");

    if (session.mode === "demo") {
      setMessage(
        "Demo mode shows the moderation UI, but status changes only persist after Supabase is connected.",
      );
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        setMessage(payload.error ?? "Could not update the job status.");
        return;
      }

      setMessage(payload.message ?? "Job status updated.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Review queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Moderate submitted opportunities
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Filter records by status, inspect details, then publish, archive, or
              send them back to pending. In Supabase mode these actions update the
              real database.
            </p>
          </div>

          <div className="w-full max-w-md">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Title, organization, city..."
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusChip
            active={activeStatus === "all"}
            count={jobs.length}
            label="All"
            onClick={() => setActiveStatus("all")}
          />
          {STATUSES.map((status) => (
            <StatusChip
              key={status}
              active={activeStatus === status}
              count={statusCounts[status]}
              label={statusLabel(status)}
              onClick={() => setActiveStatus(status)}
            />
          ))}
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            {message}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {filteredJobs.length ? (
          filteredJobs.map((job) => (
            <article
              key={job.id}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill status={job.status} />
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {job.location.label}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                    {job.title}
                  </h3>
                  <p className="mt-2 text-lg text-slate-600">{job.organization}</p>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
                    {job.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>Deadline {formatDateLabel(job.applyBy)}</span>
                    <span>Source {job.sourceDate ?? "Unknown"}</span>
                    <span>Imported via {job.importSource ?? "manual-form"}</span>
                  </div>
                </div>

                <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Workflow actions
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextActionsForStatus(job.status).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateStatus(job.id, status)}
                        disabled={isPending}
                        className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700 disabled:cursor-wait disabled:opacity-60"
                      >
                        {actionLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            No jobs match the current moderation filter.
          </div>
        )}
      </div>
    </section>
  );
}

function actionLabel(status: JobStatus) {
  if (status === "published") {
    return "Publish";
  }

  if (status === "archived") {
    return "Archive";
  }

  if (status === "pending") {
    return "Move to pending";
  }

  return "Save as draft";
}

function StatusChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-cyan-400 bg-cyan-50 text-cyan-900"
          : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-slate-900"
      }`}
    >
      {label} ({count})
    </button>
  );
}

function StatusPill({ status }: { status: JobStatus }) {
  const styles =
    status === "published"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "pending"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "archived"
          ? "bg-slate-100 text-slate-700 border-slate-200"
          : "bg-sky-50 text-sky-700 border-sky-200";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles}`}
    >
      {statusLabel(status)}
    </span>
  );
}
