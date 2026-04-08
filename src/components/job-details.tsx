"use client";

import Link from "next/link";
import { useState } from "react";
import type { JobRecord } from "@/lib/types";
import { formatDateLabel, formatRelativeDeadline, formatSourceDate } from "@/lib/utils";

export function JobDetails({ job }: { job: JobRecord | null }) {
  const [shareLabel, setShareLabel] = useState("Copy share link");

  if (!job) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
          Selected job
        </div>
        <p className="mt-3 max-w-2xl text-balance text-3xl font-semibold text-slate-900">
          Pick a job card from the left to inspect the full description and share
          it publicly.
        </p>
      </section>
    );
  }

  const activeJob = job;

  async function handleShare() {
    const shareUrl = `${window.location.origin}/jobs/${activeJob.slug}`;
    await navigator.clipboard.writeText(shareUrl);
    setShareLabel("Link copied");

    window.setTimeout(() => {
      setShareLabel("Copy share link");
    }, 1800);
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Selected job
          </div>
          <h2 className="mt-3 max-w-4xl text-balance text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
            {activeJob.title}
          </h2>
          <p className="mt-3 text-lg text-slate-600">{activeJob.organization}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
          >
            {shareLabel}
          </button>
          <a
            href={activeJob.applicationUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-100"
          >
            Open application
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Location" value={activeJob.location.label} />
        <MetricCard label="Deadline" value={formatDateLabel(activeJob.applyBy)} />
        <MetricCard
          label="Time left"
          value={formatRelativeDeadline(activeJob.applyBy)}
        />
        <MetricCard
          label="Source date"
          value={
            activeJob.sourceDate ? formatSourceDate(activeJob.sourceDate) : "Unknown"
          }
        />
      </div>

      <p className="mt-6 max-w-4xl text-base leading-8 text-slate-700">
        {activeJob.summary}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {activeJob.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-600">
        <Link
          href={`/jobs/${activeJob.slug}`}
          className="font-semibold text-cyan-700 transition hover:text-cyan-900"
        >
          Open public detail page
        </Link>
        <span>{activeJob.deadlineText}</span>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
