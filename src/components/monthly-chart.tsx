"use client";

import type { MonthlyBucket } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MonthlyChartProps {
  buckets: MonthlyBucket[];
  selectedLabel?: string;
  onSelect?: (label: string) => void;
}

export function MonthlyChart({
  buckets,
  selectedLabel,
  onSelect,
}: MonthlyChartProps) {
  const max = Math.max(...buckets.map((bucket) => bucket.value), 1);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
            Plan ahead
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Posts by month
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          Select a month to preview opportunities by source date.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 xl:grid-cols-8">
        {buckets.map((bucket) => {
          const selected = bucket.label === selectedLabel;

          return (
            <button
              key={bucket.label}
              type="button"
              onClick={() => onSelect?.(bucket.label)}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition",
                selected
                  ? "border-cpgis-deep bg-cpgis-ice"
                  : "border-slate-200 bg-white hover:border-cpgis-globe hover:bg-slate-50",
              )}
            >
              <div className="flex h-28 w-full items-end rounded-2xl bg-slate-100 px-2 py-2">
                <div
                  className={cn(
                    "w-full rounded-xl transition",
                    selected
                      ? "bg-cpgis-deep"
                      : "bg-gradient-to-t from-cpgis-deep to-cpgis-globe",
                  )}
                  style={{
                    height: `${Math.max((bucket.value / max) * 100, 12)}%`,
                  }}
                />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-900">
                  {bucket.value}
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {bucket.label.slice(2).replace("-", "/")}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
