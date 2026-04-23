"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AddressSearch } from "@/components/address-search";
import { JobDetails } from "@/components/job-details";
import { JobList } from "@/components/job-list";
import { buildDashboardMetrics, filterJobs } from "@/lib/job-filters";
import type { AddressCandidate, JobRecord, MapBounds } from "@/lib/types";

const RECENT_JOB_LIMIT = 8;

const JobsMap = dynamic(() => import("@/components/map/jobs-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[540px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-100 text-sm text-slate-500 shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:h-[640px]">
      Loading map…
    </div>
  ),
});

function sortJobsForList(jobs: JobRecord[]) {
  return [...jobs].sort((left, right) => {
    const leftDate = left.sourceDate ?? left.createdAt.slice(0, 10);
    const rightDate = right.sourceDate ?? right.createdAt.slice(0, 10);

    return rightDate.localeCompare(leftDate);
  });
}

export function JobsPortal({ jobs }: { jobs: JobRecord[] }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [limitToViewport, setLimitToViewport] = useState(true);
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

  const filteredJobs = filterJobs(jobs, {
    query,
    limitToViewport,
    bounds,
  });
  const recentJobs = sortJobsForList(filteredJobs).slice(0, RECENT_JOB_LIMIT);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId("");
      return;
    }

    if (!filteredJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(sortJobsForList(filteredJobs)[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob =
    filteredJobs.find((job) => job.id === selectedJobId) ?? recentJobs[0] ?? null;
  const metrics = buildDashboardMetrics(jobs, filteredJobs);

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
      <div className="mx-auto max-w-[1500px] px-4 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-white/60 bg-cpgis-ink px-6 py-7 text-white shadow-[0_36px_110px_rgba(16,23,47,0.24)] sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
                CPGIS Jobs map
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                This version recreates the core dashboard, including searchable
                opportunities, a map-linked list, extent-based filtering,
                shareable public detail pages, and a path to member and admin
                workflows.
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
                Map first
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                Opportunity map
              </h2>
            </div>

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
                        Keeps the list synchronized with the current map view.
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

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
            <div className="space-y-3">
              <JobsMap
                jobs={filteredJobs}
                selectedJobId={selectedJob?.id}
                focusCandidate={focusCandidate}
                focusRequestId={focusRequestId}
                mapTheme={mapTheme}
                onSelect={setSelectedJobId}
                onBoundsChange={setBounds}
              />
              <MapLegend />
            </div>

            <aside className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Published" value={String(metrics.total)} />
                <Metric label="Visible" value={String(metrics.visible)} />
                <Metric label="Cities" value={String(metrics.cities)} />
                <Metric label="Upcoming" value={String(metrics.upcomingDeadlines)} />
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
                      Map-linked list
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                      Recent opportunities
                    </h2>
                  </div>
                  <div className="text-sm text-slate-500">
                    {recentJobs.length} of {filteredJobs.length}
                  </div>
                </div>

                <JobList
                  jobs={recentJobs}
                  selectedJobId={selectedJob?.id}
                  onSelect={setSelectedJobId}
                />
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <JobDetails job={selectedJob} />
          <PartnerSpotlight />
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-cpgis-ink">{value}</div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <LegendItem color="bg-cpgis-deep" label="Active recruitment" />
      <LegendItem color="bg-cpgis-red" label="Closing within 7 days" />
      <LegendItem color="bg-slate-400" label="Expired deadline" />
      <span className="text-slate-500">
        Hover over a point to preview title, institution, city, and deadline.
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
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
