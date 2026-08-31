"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isJobExpired } from "@/lib/job-filters";
import { buildSocialDrafts } from "@/lib/social-drafts";
import type { JobRecord, JobStatus } from "@/lib/types";
import { cn, formatDateLabel, formatRelativeDeadline } from "@/lib/utils";

const STATUSES: JobStatus[] = [
  "pending",
  "needs_changes",
  "approved",
  "draft",
  "published",
  "archived",
];

const PAGE_SIZE = 25;

const NEXT_ACTIONS: Record<JobStatus, JobStatus[]> = {
  draft: ["pending"],
  pending: ["approved", "needs_changes", "archived"],
  needs_changes: ["pending", "draft"],
  approved: ["published", "needs_changes"],
  published: ["archived"],
  archived: ["draft"],
};

const STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  needs_changes: "Needs changes",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

const ACTION_LABELS: Record<JobStatus, string> = {
  draft: "Save as draft",
  pending: "Send to review",
  needs_changes: "Request changes",
  approved: "Approve",
  published: "Publish",
  archived: "Archive",
};

interface ReviewNote {
  id: string;
  author_email?: string | null;
  body: string;
  created_at: string;
}

export function AdminJobsBoard({
  jobs,
  today,
}: {
  jobs: JobRecord[];
  today: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<JobStatus | "all" | "expired">(
    jobs.some((job) => job.status === "pending") ? "pending" : "all",
  );
  const [message, setMessage] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [, startTransition] = useTransition();

  const expiredJobs = useMemo(
    () => new Set(jobs.filter((job) => isJobExpired(job, today)).map((job) => job.id)),
    [jobs, today],
  );

  const duplicateUrls = useMemo(() => {
    const counts = new Map<string, number>();

    for (const job of jobs) {
      counts.set(job.applicationUrl, (counts.get(job.applicationUrl) ?? 0) + 1);
    }

    return counts;
  }, [jobs]);

  const statusCounts = useMemo(() => {
    const counts = {} as Record<JobStatus | "all" | "expired", number>;

    for (const status of STATUSES) {
      counts[status] = 0;
    }

    for (const job of jobs) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }

    counts.all = jobs.length;
    counts.expired = expiredJobs.size;

    return counts;
  }, [jobs, expiredJobs]);

  const filteredJobs = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesStatus =
        activeStatus === "all"
          ? true
          : activeStatus === "expired"
            ? expiredJobs.has(job.id)
            : job.status === activeStatus;

      if (!matchesStatus) {
        return false;
      }

      if (!loweredQuery) {
        return true;
      }

      return [job.title, job.organization, job.location.city, job.location.country, ...job.tags]
        .join(" ")
        .toLowerCase()
        .includes(loweredQuery);
    });
  }, [activeStatus, expiredJobs, jobs, query]);

  function updateStatus(jobId: string, status: JobStatus) {
    setMessage("");

    startTransition(async () => {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };

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
              Discovery → extraction → staff verification → social drafts →
              approval → publishing. Pre-publish checks block records with
              suspicious locations, duplicates warn before you publish twice,
              and expired records drop out of public views automatically.
            </p>
          </div>

          <div className="w-full max-w-md">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Search</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Title, organization, city..."
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusChip
            active={activeStatus === "all"}
            count={statusCounts.all}
            label="All"
            onClick={() => setActiveStatus("all")}
          />
          {STATUSES.map((status) => (
            <StatusChip
              key={status}
              active={activeStatus === status}
              count={statusCounts[status]}
              label={STATUS_LABELS[status]}
              onClick={() => setActiveStatus(status)}
            />
          ))}
          <StatusChip
            active={activeStatus === "expired"}
            count={statusCounts.expired}
            label="Expired"
            tone="slate"
            onClick={() => setActiveStatus("expired")}
          />
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            {message}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {filteredJobs.length ? (
          <>
            {filteredJobs.slice(0, visibleCount).map((job) => (
              <JobReviewCard
                key={job.id}
                job={job}
                expired={expiredJobs.has(job.id)}
                duplicateCount={duplicateUrls.get(job.applicationUrl) ?? 1}
                onStatus={updateStatus}
              />
            ))}

            {filteredJobs.length > visibleCount ? (
              <div className="flex items-center justify-center gap-4 rounded-[28px] border border-dashed border-slate-300 bg-white px-4 py-4">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
                >
                  Show more
                </button>
                <span className="text-sm text-slate-500">
                  Showing {visibleCount} of {filteredJobs.length}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            No jobs match the current moderation filter.
          </div>
        )}
      </div>
    </section>
  );
}

function prePublishChecks(job: JobRecord): {
  blockers: string[];
  warnings: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (
    (job.location.latitude === 0 && job.location.longitude === 0) ||
    job.location.country === "Unknown" ||
    !job.location.city
  ) {
    blockers.push("Suspicious or missing location — review the campus coordinates first.");
  }

  if (!job.applyBy && !/until filled/i.test(job.deadlineText)) {
    warnings.push("No application deadline recorded.");
  }

  if (!job.description) {
    warnings.push("No extended description — the public page will look thin.");
  }

  if (!job.contactEmail) {
    warnings.push("No contact email captured.");
  }

  return { blockers, warnings };
}

function JobReviewCard({
  job,
  expired,
  duplicateCount,
  onStatus,
}: {
  job: JobRecord;
  expired: boolean;
  duplicateCount: number;
  onStatus: (jobId: string, status: JobStatus) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<ReviewNote[] | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [socialOpen, setSocialOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [cardMessage, setCardMessage] = useState("");

  const checks = prePublishChecks(job);
  const publishBlocked = checks.blockers.length > 0;
  const actions = NEXT_ACTIONS[job.status] ?? [];
  const social = buildSocialDrafts({
    title: job.title,
    organization: job.organization,
    applicationUrl: job.applicationUrl,
    applyBy: job.applyBy,
    city: job.location.city,
    country: job.location.country,
  });

  function loadNotes() {
    setNotesOpen((open) => !open);

    if (notes !== null) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/jobs/${job.id}/notes`);
      const payload = (await response.json()) as { notes?: ReviewNote[]; error?: string };

      if (response.ok) {
        setNotes(payload.notes ?? []);
      } else {
        setNotes([]);
      }
    });
  }

  function addNote() {
    const body = noteDraft.trim();

    if (!body) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/jobs/${job.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = (await response.json()) as { note?: ReviewNote; error?: string };

      if (!response.ok || !payload.note) {
        setCardMessage(payload.error ?? "Could not save the note.");
        return;
      }

      setNotes((current) => [...(current ?? []), payload.note as ReviewNote]);
      setNoteDraft("");
    });
  }

  function toggleSocialFlag(channel: "facebook" | "x") {
    const currentlyPosted = channel === "facebook" ? job.facebookPostedAt : job.xPostedAt;
    const body =
      channel === "facebook"
        ? { facebookPostedAt: currentlyPosted ? null : new Date().toISOString() }
        : { xPostedAt: currentlyPosted ? null : new Date().toISOString() };

    startTransition(async () => {
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { message?: string; error?: string };

      setCardMessage(
        response.ok
          ? (payload.message ?? "Social posting flag updated.")
          : (payload.error ?? "Could not update the posting flag."),
      );
    });
  }

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={job.status} />
            {expired ? <ExpiredBadge /> : null}
            {duplicateCount > 1 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Duplicate link · {duplicateCount} records
              </span>
            ) : null}
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {job.location.label}
            </span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">{job.title}</h3>
          <p className="mt-2 text-lg text-slate-600">{job.organization}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">{job.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <span>Deadline {formatDateLabel(job.applyBy)}</span>
            <span>Source {job.sourceDate ?? "Unknown"}</span>
            <span>Imported via {job.importSource ?? "manual-form"}</span>
          </div>

          {job.status !== "published" && (checks.blockers.length > 0 || checks.warnings.length > 0) ? (
            <div className="mt-4 space-y-1.5">
              {checks.blockers.map((issue) => (
                <p key={issue} className="flex items-start gap-2 text-sm text-rose-700">
                  <span aria-hidden className="mt-0.5 font-bold">⨯</span>
                  {issue}
                </p>
              ))}
              {checks.warnings.map((issue) => (
                <p key={issue} className="flex items-start gap-2 text-sm text-amber-700">
                  <span aria-hidden className="mt-0.5 font-bold">!</span>
                  {issue}
                </p>
              ))}
            </div>
          ) : null}

          {cardMessage ? (
            <p className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm text-cyan-900">
              {cardMessage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={loadNotes}
              className="font-semibold text-cyan-700 transition hover:text-cyan-900"
            >
              {notesOpen ? "Hide review notes" : "Review notes"}
              {notes && notes.length > 0 ? ` (${notes.length})` : ""}
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => setSocialOpen((open) => !open)}
              className="font-semibold text-cyan-700 transition hover:text-cyan-900"
            >
              {socialOpen ? "Hide social drafts" : "Social drafts"}
            </button>
            <span aria-hidden>·</span>
            {job.status === "published" ? (
              <Link href={`/jobs/${job.slug}`} className="font-semibold text-cyan-700 hover:text-cyan-900">
                Open public page
              </Link>
            ) : (
              <span className="text-slate-400">Public page appears after publishing</span>
            )}
          </div>

          {notesOpen ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-3">
                {(notes ?? []).map((note) => (
                  <div key={note.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-xs text-slate-500">
                      {note.author_email ?? "Reviewer"} ·{" "}
                      {new Date(note.created_at).toLocaleString()}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{note.body}</p>
                  </div>
                ))}
                {notes !== null && notes.length === 0 ? (
                  <p className="text-sm text-slate-500">No review notes yet.</p>
                ) : null}
                {notes === null ? (
                  <p className="text-sm text-slate-500">Loading notes…</p>
                ) : null}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Add a review note (required context for needs-changes requests)…"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addNote}
                  disabled={isPending || !noteDraft.trim()}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700 disabled:cursor-wait disabled:opacity-60"
                >
                  Add note
                </button>
              </div>
            </div>
          ) : null}

          {socialOpen ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SocialDraftBlock
                label="X post"
                value={social.x}
                postedAt={job.xPostedAt}
                onTogglePosted={() => toggleSocialFlag("x")}
              />
              <SocialDraftBlock
                label="Facebook post"
                value={social.facebook}
                postedAt={job.facebookPostedAt}
                onTogglePosted={() => toggleSocialFlag("facebook")}
              />
            </div>
          ) : null}
        </div>

        <div className="min-w-[260px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Workflow actions
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onStatus(job.id, status)}
                disabled={isPending || (status === "published" && publishBlocked)}
                title={
                  status === "published" && publishBlocked
                    ? checks.blockers.join(" ")
                    : undefined
                }
                className={cn(
                  "rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60",
                  status === "published"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
                    : "border-slate-300 bg-white text-slate-700 hover:border-cyan-400 hover:text-cyan-700",
                )}
              >
                {ACTION_LABELS[status]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {formatRelativeDeadline(job.applyBy)}
            {job.status === "published" && expired
              ? " · record stays published but is hidden from active views"
              : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

function SocialDraftBlock({
  label,
  value,
  postedAt,
  onTogglePosted,
}: {
  label: string;
  value: string;
  postedAt?: string;
  onTogglePosted: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onTogglePosted}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              postedAt
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-300 text-slate-600 hover:border-emerald-300 hover:text-emerald-700",
            )}
          >
            {postedAt ? "Posted ✓" : "Mark posted"}
          </button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function StatusChip({
  active,
  count,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  tone?: "slate";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? tone === "slate"
            ? "border-slate-400 bg-slate-100 text-slate-800"
            : "border-cyan-400 bg-cyan-50 text-cyan-900"
          : tone === "slate"
            ? "border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800"
            : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-slate-900",
      )}
    >
      {label} ({count})
    </button>
  );
}

function ExpiredBadge() {
  return (
    <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      Expired
    </span>
  );
}

function StatusPill({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, string> = {
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    needs_changes: "bg-orange-50 text-orange-700 border-orange-200",
    approved: "bg-teal-50 text-teal-700 border-teal-200",
    archived: "bg-slate-100 text-slate-700 border-slate-200",
    draft: "bg-sky-50 text-sky-700 border-sky-200",
  };

  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        styles[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
