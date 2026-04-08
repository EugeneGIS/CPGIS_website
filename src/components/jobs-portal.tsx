"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AddressSearch } from "@/components/address-search";
import { JobDetails } from "@/components/job-details";
import { JobList } from "@/components/job-list";
import { MonthlyChart } from "@/components/monthly-chart";
import {
  buildDashboardMetrics,
  buildMonthlyBuckets,
  filterJobs,
} from "@/lib/job-filters";
import type { AddressCandidate, JobRecord, MapBounds } from "@/lib/types";

const JobsMap = dynamic(() => import("@/components/map/jobs-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-100 text-sm text-slate-500 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      Loading map…
    </div>
  ),
});

export function JobsPortal({ jobs }: { jobs: JobRecord[] }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [limitToViewport, setLimitToViewport] = useState(true);
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<AddressCandidate[]>([]);
  const [focusCandidate, setFocusCandidate] = useState<AddressCandidate | null>(null);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [addressError, setAddressError] = useState("");
  const [isPending, startTransition] = useTransition();
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  const filteredJobs = filterJobs(jobs, {
    query,
    limitToViewport,
    bounds,
  });

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId("");
      return;
    }

    if (!filteredJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob =
    filteredJobs.find((job) => job.id === selectedJobId) ?? filteredJobs[0] ?? null;
  const metrics = buildDashboardMetrics(jobs, filteredJobs);
  const monthlyBuckets = buildMonthlyBuckets(filteredJobs.length ? filteredJobs : jobs);

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
    mapSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_28%),linear-gradient(180deg,_#f7fbff_0%,_#eef6f8_100%)] pb-16">
      <div className="mx-auto max-w-[1500px] px-4 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-white/60 bg-slate-950 px-6 py-8 text-white shadow-[0_40px_120px_rgba(15,23,42,0.25)] sm:px-8 lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
                CPGIS Jobs map
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                This version recreates the core dashboard, including searchable
                opportunities, a map-linked list, extent-based filtering,
                shareable public detail pages, and a path to member and admin
                workflows.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/submit"
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Submit a job
              </Link>
              <Link
                href="/admin"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
              >
                Admin workspace
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[370px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <AddressSearch
              query={addressQuery}
              results={addressResults}
              pending={isPending}
              onQueryChange={setAddressQuery}
              onSearch={handleAddressSearch}
              onPick={handleAddressPick}
            />

            {addressError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {addressError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Filters
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Search and map extent
                </h2>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Search jobs
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Title, institution, city, topic..."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                />
              </label>

              <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <input
                  checked={limitToViewport}
                  onChange={(event) => setLimitToViewport(event.target.checked)}
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Filter by visible map area
                  </div>
                  <div className="text-sm text-slate-600">
                    Mimics ArcGIS extent filtering by only listing positions inside
                    the current map view.
                  </div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Published" value={String(metrics.total)} />
              <Metric label="Visible now" value={String(metrics.visible)} />
              <Metric label="Cities" value={String(metrics.cities)} />
              <Metric label="Upcoming" value={String(metrics.upcomingDeadlines)} />
            </div>

            <MonthlyChart buckets={monthlyBuckets} />

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                    Opportunities
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    Current list
                  </h2>
                </div>
                <div className="text-sm text-slate-500">{filteredJobs.length} rows</div>
              </div>

              <JobList
                jobs={filteredJobs}
                selectedJobId={selectedJobId}
                onSelect={setSelectedJobId}
              />
            </div>
          </aside>

          <section className="grid gap-6 xl:grid-rows-[minmax(340px,auto)_minmax(480px,1fr)]">
            <JobDetails job={selectedJob} />

            <div ref={mapSectionRef} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                    Map
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    Toggle light or dark OSM basemap
                  </h2>
                </div>

                <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <button
                    type="button"
                    onClick={() => setMapTheme("light")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      mapTheme === "light"
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Light OSM
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTheme("dark")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      mapTheme === "dark"
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Dark OSM
                  </button>
                </div>
              </div>

              <JobsMap
                jobs={filteredJobs.length ? filteredJobs : jobs}
                selectedJobId={selectedJob?.id}
                focusCandidate={focusCandidate}
                focusRequestId={focusRequestId}
                mapTheme={mapTheme}
                onSelect={setSelectedJobId}
                onBoundsChange={setBounds}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
