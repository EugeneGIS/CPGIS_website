"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MonthlyChart } from "@/components/monthly-chart";
import { isJobExpired, type PlanAheadData } from "@/lib/job-filters";
import type { JobRecord } from "@/lib/types";
import { cn, formatDateLabel, formatRelativeDeadline, formatSourceDate } from "@/lib/utils";

const MONTH_BATCH_SIZE = 12;
const ROLLING_BATCH_SIZE = 6;

export function PlanAhead({
  data,
  today,
}: {
  data: PlanAheadData;
  today: string;
}) {
  const { upcoming, past, jobsByMonth, rolling, currentMonth } = data;
  const [showPast, setShowPast] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(upcoming[0]?.label ?? "");
  const [visibleCount, setVisibleCount] = useState(MONTH_BATCH_SIZE);
  const [rollingCount, setRollingCount] = useState(ROLLING_BATCH_SIZE);

  const monthJobs = useMemo(() => {
    const list = jobsByMonth[selectedMonth] ?? [];
    // Past-month browsing shows every historical record; the default view only
    // counts deadlines that have not passed yet.
    return showPast ? list : list.filter((job) => !isJobExpired(job, today));
  }, [jobsByMonth, selectedMonth, showPast, today]);

  const expiredInMonth = useMemo(
    () =>
      showPast
        ? (jobsByMonth[selectedMonth] ?? []).filter((job) =>
            isJobExpired(job, today),
          ).length
        : 0,
    [jobsByMonth, selectedMonth, showPast, today],
  );

  const visibleMonthJobs = monthJobs.slice(0, visibleCount);

  function selectMonth(label: string) {
    setSelectedMonth(label);
    setVisibleCount(MONTH_BATCH_SIZE);
  }

  function togglePast(next: boolean) {
    setShowPast(next);

    if (!next) {
      // Leaving past-month mode with a historical month selected would show an
      // empty active list, so fall back to the earliest current-or-future month.
      if (selectedMonth && selectedMonth < currentMonth) {
        selectMonth(upcoming[0]?.label ?? "");
      }
      return;
    }

    // Entering past-month mode from an empty default view: preselect the most
    // recent historical month so the list below is immediately useful.
    if (!selectedMonth && past.length > 0) {
      selectMonth(past[past.length - 1].label);
    }
  }

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
                Deadlines by month
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Browse opportunities by application deadline month. Positions
                without a deadline are listed separately while they stay within
                two months of publication; past months are one toggle away.
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

        {upcoming.length > 0 || showPast ? (
          <div className="mt-6">
            <MonthlyChart
              upcoming={upcoming}
              past={past}
              currentMonth={currentMonth}
              showPast={showPast}
              selectedLabel={selectedMonth}
              onSelect={selectMonth}
              onTogglePast={togglePast}
            />
          </div>
        ) : null}

        {selectedMonth ? (
          <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
                  Selected month
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {monthJobs.length}{" "}
                  {monthJobs.length === 1 ? "opportunity" : "opportunities"}
                </h2>
              </div>
              {expiredInMonth > 0 ? (
                <p className="text-xs text-slate-500">
                  {expiredInMonth} already past the deadline
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleMonthJobs.map((job) => (
                <DeadlineJobCard
                  key={job.id}
                  job={job}
                  today={today}
                  showExpired={showPast}
                />
              ))}
            </div>

            {monthJobs.length > visibleCount ? (
              <div className="mt-5 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((count) => count + MONTH_BATCH_SIZE)
                  }
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
                >
                  Show more
                </button>
                <span className="text-sm text-slate-500">
                  Showing {visibleCount} of {monthJobs.length}
                </span>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-sm text-slate-600">
              No current or upcoming deadline months to show.
            </p>
            {past.length > 0 ? (
              <button
                type="button"
                onClick={() => togglePast(true)}
                className="mt-4 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
              >
                Show past months
              </button>
            ) : null}
          </section>
        )}

        {rolling.length > 0 ? (
          <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
                  Open until filled
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {rolling.length} rolling{" "}
                  {rolling.length === 1 ? "position" : "positions"}
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Posted within the last two months · apply anytime
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rolling.slice(0, rollingCount).map((job) => (
                <RollingJobCard key={job.id} job={job} />
              ))}
            </div>

            {rolling.length > rollingCount ? (
              <div className="mt-5 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setRollingCount((count) => count + ROLLING_BATCH_SIZE)
                  }
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
                >
                  Show more
                </button>
                <span className="text-sm text-slate-500">
                  Showing {Math.min(rollingCount, rolling.length)} of{" "}
                  {rolling.length}
                </span>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function DeadlineJobCard({
  job,
  today,
  showExpired,
}: {
  job: JobRecord;
  today: string;
  showExpired: boolean;
}) {
  const expired = showExpired && isJobExpired(job, today);

  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-cpgis-globe hover:bg-cpgis-ice"
    >
      <div
        className="line-clamp-2 break-words text-sm font-semibold leading-6 text-slate-950"
        title={job.title}
      >
        {job.title}
      </div>
      <div
        className="mt-1 line-clamp-2 break-words text-sm text-slate-600"
        title={job.organization}
      >
        {job.organization}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="max-w-full truncate">{job.location.city}</span>
        <span aria-hidden>·</span>
        <span>Deadline: {formatDateLabel(job.applyBy)}</span>
        <span
          className={cn(
            expired && "font-semibold text-rose-600",
          )}
        >
          {expired ? "Deadline passed" : formatRelativeDeadline(job.applyBy)}
        </span>
      </div>
    </Link>
  );
}

function RollingJobCard({ job }: { job: JobRecord }) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-cpgis-globe hover:bg-cpgis-ice"
    >
      <div
        className="line-clamp-2 break-words text-sm font-semibold leading-6 text-slate-950"
        title={job.title}
      >
        {job.title}
      </div>
      <div
        className="mt-1 line-clamp-2 break-words text-sm text-slate-600"
        title={job.organization}
      >
        {job.organization}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="max-w-full truncate">{job.location.city}</span>
        <span aria-hidden>·</span>
        <span>Posted {formatSourceDate(job.sourceDate)}</span>
        <span aria-hidden>·</span>
        <span>Apply anytime</span>
      </div>
    </Link>
  );
}
