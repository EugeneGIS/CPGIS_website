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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
          Address Search
        </p>
        <p className="mt-1 text-sm text-slate-600">
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
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none ring-0 placeholder:text-slate-400 focus:border-cpgis-globe"
        />
        <button
          type="button"
          onClick={onSearch}
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
            pending
              ? "cursor-wait bg-slate-700 text-slate-300"
              : "bg-cpgis-deep text-white hover:bg-cpgis-ink",
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
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-cpgis-globe hover:bg-cpgis-ice"
            >
              <div className="text-sm font-medium text-slate-950">
                {result.label}
              </div>
              <div className="mt-1 text-xs text-slate-500">
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
