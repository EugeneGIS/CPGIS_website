"use client";

import type { JobRecord } from "@/lib/types";
import { cn, formatDateLabel, formatRelativeDeadline } from "@/lib/utils";

interface JobListProps {
  jobs: JobRecord[];
  selectedJobId?: string;
  onSelect: (jobId: string) => void;
}

export function JobList({ jobs, selectedJobId, onSelect }: JobListProps) {
  if (!jobs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        No jobs match the current query and map extent. Try clearing the search or
        widening the map.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        const isSelected = job.id === selectedJobId;

        return (
          <button
            key={job.id}
            type="button"
            onClick={() => onSelect(job.id)}
            className={cn(
              "block w-full rounded-2xl border px-4 py-4 text-left transition",
              isSelected
                ? "border-cyan-500 bg-slate-950 text-white shadow-[0_24px_60px_rgba(6,182,212,0.15)]"
                : "border-slate-200 bg-white text-slate-900 hover:border-cyan-300 hover:bg-cyan-50/30",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold leading-6">{job.title}</div>
                <div
                  className={cn(
                    "mt-1 text-sm",
                    isSelected ? "text-slate-300" : "text-slate-600",
                  )}
                >
                  {job.organization}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
                  isSelected
                    ? "bg-cyan-400/15 text-cyan-200"
                    : "bg-cyan-50 text-cyan-700",
                )}
              >
                {job.location.city}
              </div>
            </div>

            <div
              className={cn(
                "mt-3 flex flex-wrap gap-2 text-xs",
                isSelected ? "text-slate-300" : "text-slate-500",
              )}
            >
              <span>Deadline: {formatDateLabel(job.applyBy)}</span>
              <span>•</span>
              <span>{formatRelativeDeadline(job.applyBy)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
