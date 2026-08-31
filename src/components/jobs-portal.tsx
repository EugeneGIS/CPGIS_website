"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AddressSearch } from "@/components/address-search";
import { BackToTop } from "@/components/back-to-top";
import { JobList } from "@/components/job-list";
import { MARKER_PALETTE } from "@/components/map/jobs-map-helpers";
import { SOUTH_CHINA_SEA_LINE_PALETTE } from "@/components/map/south-china-sea-style";
import { filterJobs } from "@/lib/job-filters";
import type { AddressCandidate, JobRecord, MapBounds } from "@/lib/types";

const JobsMap = dynamic(() => import("@/components/map/jobs-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[540px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-100 text-sm text-slate-500 shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:h-[640px]">
      Loading map…
    </div>
  ),
});

export function JobsPortal({ jobs }: { jobs: JobRecord[] }) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [query, setQuery] = useState("");
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [limitToViewport, setLimitToViewport] = useState(false);
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<AddressCandidate[]>([]);
  const [focusCandidate, setFocusCandidate] = useState<AddressCandidate | null>(
    null,
  );
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [addressError, setAddressError] = useState("");
  const [isPending, startTransition] = useTransition();
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  const filteredJobs = useMemo(
    () =>
      filterJobs(jobs, {
        query,
        limitToViewport,
        bounds,
      }),
    [bounds, jobs, limitToViewport, query],
  );

  useEffect(() => {
    if (
      selectedJobId &&
      !filteredJobs.some((job) => job.id === selectedJobId)
    ) {
      setSelectedJobId("");
    }
  }, [filteredJobs, selectedJobId]);

  const feedResetKey = `${query}:${limitToViewport}:${
    limitToViewport && bounds
      ? `${bounds.north}:${bounds.south}:${bounds.east}:${bounds.west}`
      : "all"
  }`;

  function handleAddressSearch() {
    if (!addressQuery.trim()) {
      setAddressResults([]);
      setAddressError("");
      return;
    }

    setAddressError("");

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(addressQuery.trim())}`,
        );
        const payload = (await response.json()) as {
          results?: AddressCandidate[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Address search failed.");
        }

        setAddressResults(payload.results ?? []);
      } catch (error) {
        setAddressError(
          error instanceof Error ? error.message : "Address search failed.",
        );
      }
    });
  }

  function handleAddressPick(candidate: AddressCandidate) {
    setFocusCandidate({ ...candidate });
    setFocusRequestId((current) => current + 1);
    setAddressResults([]);
    setAddressQuery(candidate.label);
    setSearchPanelOpen(false);
    mapSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(54,183,216,0.18),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#edf4f8_100%)] pb-16">
      <BackToTop />
      <div className="mx-auto max-w-[1500px] px-4 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-white/60 bg-cpgis-ink px-6 py-7 text-white shadow-[0_36px_110px_rgba(16,23,47,0.24)] sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
                CPGIS Jobs map
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Explore searchable opportunities, inspect their locations, and
                open a shareable public page for every position.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/plan-ahead"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-cpgis-globe hover:text-cpgis-globe"
              >
                Plan ahead
              </Link>
              <Link
                href="/submit"
                className="rounded-full bg-cpgis-globe px-5 py-3 text-sm font-semibold text-cpgis-ink transition hover:bg-white"
              >
                Submit a job
              </Link>
              <Link
                href="/admin"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-cpgis-globe hover:text-cpgis-globe"
              >
                Admin workspace
              </Link>
            </div>
          </div>
        </section>

        <section ref={mapSectionRef} className="mt-6 space-y-4">
          <h2 className="sr-only">Job map</h2>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                title="Search by address, title, institution, city, and map extent"
                onClick={() => setSearchPanelOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-cpgis-ink shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition hover:border-cpgis-globe hover:bg-cpgis-ice"
              >
                <Search className="h-4 w-4" />
                Search
              </button>

              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <button
                  type="button"
                  onClick={() => setMapTheme("light")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mapTheme === "light"
                      ? "bg-cpgis-deep text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setMapTheme("dark")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mapTheme === "dark"
                      ? "bg-cpgis-ink text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>

          {searchPanelOpen ? (
            <div className="rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-cpgis-deep" />
                  <h3 className="text-base font-semibold text-slate-950">
                    Search and filters
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchPanelOpen(false)}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-cpgis-globe hover:text-cpgis-deep"
                  aria-label="Close search panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
                <AddressSearch
                  query={addressQuery}
                  results={addressResults}
                  pending={isPending}
                  onQueryChange={setAddressQuery}
                  onSearch={handleAddressSearch}
                  onPick={handleAddressPick}
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-800">
                      Filter by title, institution, city, or topic
                    </span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="e.g. remote sensing, EPFL, Lausanne"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cpgis-globe"
                    />
                  </label>

                  <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <input
                      checked={limitToViewport}
                      onChange={(event) =>
                        setLimitToViewport(event.target.checked)
                      }
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-cpgis-deep"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Filter by visible map area
                      </div>
                      <div className="text-sm text-slate-600">
                        Only when enabled, restricts the jobs feed to the current
                        map view.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {addressError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {addressError}
            </div>
          ) : null}

          <div className="space-y-3">
            <JobsMap
              jobs={filteredJobs}
              selectedJobId={selectedJobId || undefined}
              focusCandidate={focusCandidate}
              focusRequestId={focusRequestId}
              mapTheme={mapTheme}
              onSelect={setSelectedJobId}
              onClearSelection={() => setSelectedJobId("")}
              onBoundsChange={setBounds}
            />
            <MapLegend mapTheme={mapTheme} />
          </div>
        </section>

        <section className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
                  Selected jobs
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Matching opportunities
                </h2>
              </div>
              <div className="text-sm text-slate-500">
                {filteredJobs.length} matching jobs
              </div>
            </div>

            <JobList
              key={feedResetKey}
              jobs={filteredJobs}
              selectedJobId={selectedJobId || undefined}
              onSelect={setSelectedJobId}
            />
          </div>
          <PartnerSpotlight />
        </section>
      </div>
    </main>
  );
}

function MapLegend({ mapTheme }: { mapTheme: "light" | "dark" }) {
  const palette = MARKER_PALETTE[mapTheme];
  const isDark = mapTheme === "dark";

  return (
    <div
      className={`flex flex-wrap gap-3 rounded-2xl border px-4 py-3 text-xs shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-colors ${
        isDark
          ? "border-slate-700 bg-cpgis-ink text-slate-200"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <LegendItem color={palette.active.fill} label="Active recruitment" />
      <LegendItem color={palette.closingSoon.fill} label="Closing within 7 days" />
      <LegendItem color={palette.expired.fill} label="Expired" />
      <LineLegendItem
        color={SOUTH_CHINA_SEA_LINE_PALETTE[mapTheme]}
        label="South China Sea ten-dash line"
      />
      <span className={isDark ? "text-slate-400" : "text-slate-500"}>
        Hover over a point to preview title, institution, city, and deadline.
      </span>
    </div>
  );
}

function LineLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-[3px] w-5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-3 w-3 rounded-full border border-white/40"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function PartnerSpotlight() {
  return (
    <aside className="rounded-[28px] border border-dashed border-cpgis-globe/50 bg-white/80 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
        Partner spotlight
      </p>
      <h2 className="mt-3 text-xl font-semibold text-slate-950">
        Space for institutions and labs
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        This area can later host sponsor messages, lab recruitment highlights,
        or CPGIS announcements without competing with the map.
      </p>
      <Link
        href="/submit"
        className="mt-5 inline-flex rounded-full bg-cpgis-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-cpgis-ink"
      >
        Submit an opportunity
      </Link>
    </aside>
  );
}
