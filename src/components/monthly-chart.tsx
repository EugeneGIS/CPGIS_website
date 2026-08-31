"use client";

import { format, parseISO } from "date-fns";
import type { MonthlyBucket } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MonthlyChartProps {
  upcoming: MonthlyBucket[];
  past: MonthlyBucket[];
  currentMonth: string;
  showPast: boolean;
  selectedLabel?: string;
  onSelect?: (label: string) => void;
  onTogglePast?: (show: boolean) => void;
}

function formatMonthLabel(label: string) {
  return format(parseISO(`${label}-01`), "MMM yyyy");
}

export function MonthlyChart({
  upcoming,
  past,
  currentMonth,
  showPast,
  selectedLabel,
  onSelect,
  onTogglePast,
}: MonthlyChartProps) {
  const visible = showPast ? [...upcoming, ...past] : upcoming;
  const max = Math.max(...visible.map((bucket) => bucket.value), 1);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
            Plan ahead
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Deadlines by month
          </h3>
        </div>

        {past.length > 0 ? (
          <button
            type="button"
            role="switch"
            aria-checked={showPast}
            onClick={() => onTogglePast?.(!showPast)}
            className="flex items-center gap-3 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-slate-900"
          >
            <span
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition",
                showPast ? "bg-cpgis-deep" : "bg-slate-300",
              )}
            >
              <span
                className={cn(
                  "absolute h-4 w-4 rounded-full bg-white shadow transition-all",
                  showPast ? "left-[18px]" : "left-0.5",
                )}
              />
            </span>
            Show past months
          </button>
        ) : null}
      </div>

      {visible.length ? (
        <div>
          <p className="mt-4 border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Current &amp; upcoming
          </p>
          <div className="divide-y divide-slate-100">
            {upcoming.map((bucket) => (
              <MonthRow
                key={bucket.label}
                bucket={bucket}
                max={max}
                currentMonth={currentMonth}
                selected={bucket.label === selectedLabel}
                onSelect={onSelect}
              />
            ))}
          </div>

          {showPast && past.length > 0 ? (
            <>
              <p className="mt-6 border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Past months
              </p>
              <div className="divide-y divide-slate-100">
                {past.map((bucket) => (
                  <MonthRow
                    key={bucket.label}
                    bucket={bucket}
                    max={max}
                    currentMonth={currentMonth}
                    historical
                    selected={bucket.label === selectedLabel}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          No current or upcoming deadlines right now.
        </p>
      )}
    </div>
  );
}

function MonthRow({
  bucket,
  max,
  currentMonth,
  historical = false,
  selected,
  onSelect,
}: {
  bucket: MonthlyBucket;
  max: number;
  currentMonth: string;
  historical?: boolean;
  selected: boolean;
  onSelect?: (label: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(bucket.label)}
      className={cn(
        "-mx-3 flex w-[calc(100%+24px)] items-center gap-3 rounded-2xl px-3 py-3 text-left transition sm:gap-5",
        selected
          ? "bg-cpgis-ice"
          : "hover:bg-slate-50",
      )}
    >
      <div className="w-[84px] shrink-0 sm:w-28">
        <div
          className={cn(
            "text-sm font-semibold",
            historical ? "text-slate-500" : "text-slate-900",
          )}
        >
          {formatMonthLabel(bucket.label)}
        </div>
        {bucket.label === currentMonth ? (
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cpgis-globe">
            This month
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "w-8 shrink-0 text-right text-sm font-semibold tabular-nums",
          historical ? "text-slate-500" : "text-slate-700",
        )}
      >
        {bucket.value}
      </div>

      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            selected
              ? "bg-cpgis-deep"
              : historical
                ? "bg-slate-400"
                : "bg-gradient-to-r from-cpgis-deep to-cpgis-globe",
          )}
          style={{
            width: `${Math.max((bucket.value / max) * 100, 4)}%`,
          }}
        />
      </div>
    </button>
  );
}
