"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JobActions } from "@/components/job-actions";
import {
  JOB_FEED_BATCH_SIZE,
  nextJobFeedCount,
  sortJobsForFeed,
} from "@/lib/job-feed";
import type { JobRecord } from "@/lib/types";
import { cn, formatDateLabel, formatRelativeDeadline } from "@/lib/utils";

interface JobListProps {
  jobs: JobRecord[];
  selectedJobId?: string;
  onSelect: (jobId: string) => void;
}

export function JobList({
  jobs,
  selectedJobId,
  onSelect,
}: JobListProps) {
  const [visibleCount, setVisibleCount] = useState(JOB_FEED_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const orderedJobs = useMemo(
    () => sortJobsForFeed(jobs, selectedJobId),
    [jobs, selectedJobId],
  );
  const visibleJobs = orderedJobs.slice(0, visibleCount);
  const hasMore = visibleCount < orderedJobs.length;

  const loadMore = useCallback(() => {
    setVisibleCount((current) =>
      nextJobFeedCount(current, orderedJobs.length),
    );
  }, [orderedJobs.length]);

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (
      !hasMore ||
      !loadMoreElement ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(loadMoreElement);

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (!jobs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        No jobs match the current filters. Try clearing the search or disabling
        the visible-area filter.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleJobs.map((job) => {
        const isSelected = job.id === selectedJobId;

        return (
          <article
            key={job.id}
            className={cn(
              "rounded-2xl border px-4 py-4 transition",
              isSelected
                ? "border-cpgis-deep bg-cpgis-ice shadow-[0_24px_60px_rgba(47,69,166,0.14)] ring-2 ring-cpgis-deep/15"
                : "border-slate-200 bg-white text-slate-900 hover:border-cpgis-globe",
            )}
            aria-label={isSelected ? `${job.title}, selected on map` : undefined}
          >
            <button
              type="button"
              onClick={() => onSelect(job.id)}
              className="block w-full text-left focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cpgis-deep"
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold leading-6">
                    {job.title}
                  </h3>
                  <div className="mt-1 text-sm text-slate-600">
                    {job.organization}
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
                    isSelected
                      ? "bg-cpgis-deep text-white"
                      : "bg-cpgis-ice text-cpgis-deep",
                  )}
                >
                  {job.location.city}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>Deadline: {formatDateLabel(job.applyBy)}</span>
                <span aria-hidden="true">•</span>
                <span>{formatRelativeDeadline(job.applyBy)}</span>
                {isSelected ? (
                  <span className="font-semibold text-cpgis-deep">
                    Selected on map
                  </span>
                ) : null}
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                {job.summary}
              </p>
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
              <JobActions job={job} compact />
              <Link
                href={`/jobs/${job.slug}`}
                className="text-xs font-semibold text-cpgis-deep transition hover:text-cpgis-ink"
              >
                View details
              </Link>
            </div>
          </article>
        );
      })}

      {hasMore ? (
        <div ref={loadMoreRef} className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cpgis-globe hover:text-cpgis-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cpgis-deep"
          >
            Load 5 more
          </button>
          <span className="text-xs text-slate-500" aria-live="polite">
            Showing {visibleJobs.length} of {orderedJobs.length}
          </span>
        </div>
      ) : (
        <p className="pt-2 text-center text-xs text-slate-500" aria-live="polite">
          All {orderedJobs.length} matching jobs are shown.
        </p>
      )}
    </div>
  );
}
