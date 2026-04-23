"use client";

import Link from "next/link";
import { useState } from "react";
import { MonthlyChart } from "@/components/monthly-chart";
import { buildMonthlyBuckets } from "@/lib/job-filters";
import type { JobRecord } from "@/lib/types";
import { formatDateLabel, formatRelativeDeadline } from "@/lib/utils";

function getJobMonth(job: JobRecord) {
  return (job.sourceDate ?? job.createdAt.slice(0, 10)).slice(0, 7);
}

function sortByDeadline(left: JobRecord, right: JobRecord) {
  const leftValue = left.applyBy ?? "9999-12-31";
  const rightValue = right.applyBy ?? "9999-12-31";

  return leftValue.localeCompare(rightValue);
}

export function PlanAhead({ jobs }: { jobs: JobRecord[] }) {
  const buckets = buildMonthlyBuckets(jobs);
  const initialMonth = buckets.at(-1)?.label ?? "";
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const monthJobs = jobs
    .filter((job) => getJobMonth(job) === selectedMonth)
    .sort(sortByDeadline);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#edf4f8_100%)] pb-16">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-white/70 bg-cpgis-ink px-6 py-8 text-white shadow-[0_36px_100px_rgba(16,23,47,0.24)] sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-globe">
                Plan ahead
              </p>
              <h1 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
                Posts by month
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Explore the opportunity timeline by source month, then open
                individual records when planning application windows.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-cpgis-globe hover:text-cpgis-globe"
            >
              Back to map
            </Link>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <MonthlyChart
            buckets={buckets}
            selectedLabel={selectedMonth}
            onSelect={setSelectedMonth}
          />

          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
                {selectedMonth || "No month selected"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {monthJobs.length} opportunities
              </h2>
            </div>

            <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
              {monthJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.slug}`}
                  className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-cpgis-globe hover:bg-cpgis-ice"
                >
                  <div className="text-sm font-semibold leading-6 text-slate-950">
                    {job.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {job.organization}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{job.location.city}</span>
                    <span>Deadline: {formatDateLabel(job.applyBy)}</span>
                    <span>{formatRelativeDeadline(job.applyBy)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
