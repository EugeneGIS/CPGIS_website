"use client";

import type { AddressCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AddressSearchProps {
  query: string;
  results: AddressCandidate[];
  pending: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onPick: (candidate: AddressCandidate) => void;
}

export function AddressSearch({
  query,
  results,
  pending,
  onQueryChange,
  onSearch,
  onPick,
}: AddressSearchProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Address Search
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Find a city, campus, or full address and recenter the map.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
            }
          }}
          placeholder="e.g. Zurich, ETH or UC Berkeley"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
        />
        <button
          type="button"
          onClick={onSearch}
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
            pending
              ? "cursor-wait bg-slate-700 text-slate-300"
              : "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
          )}
          disabled={pending}
        >
          {pending ? "Searching" : "Search"}
        </button>
      </div>

      {results.length > 0 ? (
        <div className="mt-3 space-y-2">
          {results.map((result) => (
            <button
              key={`${result.label}-${result.latitude}-${result.longitude}`}
              type="button"
              onClick={() => onPick(result)}
              className="block w-full rounded-xl border border-white/8 bg-slate-900/80 px-3 py-2 text-left transition hover:border-cyan-400/60 hover:bg-slate-800"
            >
              <div className="text-sm font-medium text-white">{result.label}</div>
              <div className="mt-1 text-xs text-slate-400">
                {result.city || "Unknown city"}
                {result.country ? `, ${result.country}` : ""}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
