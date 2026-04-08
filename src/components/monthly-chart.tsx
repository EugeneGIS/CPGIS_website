import type { MonthlyBucket } from "@/lib/types";

export function MonthlyChart({ buckets }: { buckets: MonthlyBucket[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.value), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Timeline
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            Posts by month
          </h3>
        </div>
        <p className="text-xs text-slate-500">Source date aggregation</p>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end rounded-2xl bg-slate-100 px-2 py-2">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-cyan-500 to-teal-400"
                style={{ height: `${Math.max((bucket.value / max) * 100, 12)}%` }}
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
          </div>
        ))}
      </div>
    </div>
  );
}
