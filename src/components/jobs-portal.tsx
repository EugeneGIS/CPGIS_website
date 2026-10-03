"use client";

import { Search, Share2, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AddressSearch } from "@/components/address-search";
import { BackToTop } from "@/components/back-to-top";
import { JobList } from "@/components/job-list";
import { MARKER_PALETTE } from "@/components/map/jobs-map-helpers";
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

export function JobsPortal({
  jobs,
  expiredCount,
}: {
  jobs: JobRecord[];
  expiredCount: number;
}) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [query, setQuery] = useState("");
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [limitToViewport, setLimitToViewport] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [expiredJobs, setExpiredJobs] = useState<JobRecord[] | null>(null);
  const [expiredLoading, setExpiredLoading] = useState(false);
  const [expiredError, setExpiredError] = useState("");
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [share, setShare] = useState<{ url: string; imageUrl: string; previewPath: string; count: number; persisted: boolean } | null>(null);
  const [shareError, setShareError] = useState("");
  const [sharing, setSharing] = useState(false);
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

  // Expired records stay in the archive behind a toggle instead of cluttering
  // the active recruitment map.
  const activeJobs = useMemo(
    () => showExpired ? [...jobs, ...(expiredJobs ?? [])] : jobs,
    [jobs, expiredJobs, showExpired],
  );

  const filteredJobs = useMemo(
    () =>
      filterJobs(activeJobs, {
        query,
        limitToViewport,
        bounds,
      }),
    [activeJobs, bounds, limitToViewport, query],
  );

  async function handleShowExpired() {
    if (expiredJobs) {
      setShowExpired(true);
      return;
    }
    setExpiredLoading(true);
    setExpiredError("");
    try {
      const response = await fetch("/api/jobs/expired");
      const payload = await response.json() as { jobs?: JobRecord[]; error?: string };
      if (!response.ok || !payload.jobs) throw new Error(payload.error ?? "Could not load past postings.");
      setExpiredJobs(payload.jobs);
      setShowExpired(true);
    } catch (error) {
      setExpiredError(error instanceof Error ? error.message : "Could not load past postings.");
    } finally {
      setExpiredLoading(false);
    }
  }

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

  async function handleShareMap() {
    if (!bounds) return;
    setSharing(true);
    setShareError("");
    setShare(null);
    try {
      const response = await fetch("/api/map-shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bounds, query, includeExpired: showExpired, theme: mapTheme }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create a map share.");
      let imageReady = false;
      for (let attempt = 0; attempt < 2 && !imageReady; attempt += 1) {
        try {
          const image = await fetch(payload.imageUrl, { signal: AbortSignal.timeout(12000) });
          if (!image.ok || !image.headers.get("content-type")?.startsWith("image/")) continue;
          await image.arrayBuffer();
          imageReady = true;
        } catch {
          // A second request can succeed after the first one warms the image cache.
        }
      }
      if (!imageReady) throw new Error("The map thumbnail is not ready yet. Please try sharing again in a moment.");
      setShare(payload);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Could not create a map share.");
    } finally {
      setSharing(false);
    }
  }

  async function copyShareLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
    } catch {
      setShareError("Clipboard access failed. Open the preview page to copy the URL.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(54,183,216,0.18),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#edf4f8_100%)] pb-16">
      <BackToTop />
      <div className="mx-auto max-w-[1500px] px-4 pt-6 sm:px-6 lg:px-8">
        <section ref={mapSectionRef} className="space-y-4">
          <h1 className="sr-only">CPGIS Jobs map</h1>
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

              <button
                type="button"
                title="Share the jobs in the current map area"
                disabled={!bounds || sharing}
                onClick={handleShareMap}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-cpgis-ink shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition hover:border-cpgis-globe hover:bg-cpgis-ice disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                {sharing ? "Preparing preview…" : "Share this map"}
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

                  <label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <input
                      checked={showExpired}
                      disabled={expiredLoading}
                      onChange={(event) => event.target.checked ? void handleShowExpired() : setShowExpired(false)}
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-cpgis-deep"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Show expired postings
                      </div>
                      <div className="text-sm text-slate-600">
                        {expiredCount.toLocaleString()} archived records whose deadline or
                        stated appointment start passed, or that were posted more than
                        60 days ago without a start date. They stay hidden until enabled.
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

          {shareError && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{shareError}</p>}
          {share && <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cpgis-globe/40 bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold text-slate-950">{share.count} jobs in this shared area</p>
              <p className="text-sm text-slate-600">{share.persisted ? "Saved selection" : "Live selection; jobs may change without a database"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={share.previewPath} className="rounded-full border border-cpgis-deep px-4 py-2 text-sm font-semibold text-cpgis-deep hover:bg-cpgis-ice">Preview page</Link>
              <button type="button" onClick={copyShareLink} className="rounded-full bg-cpgis-deep px-4 py-2 text-sm font-semibold text-white hover:bg-cpgis-ink">Copy link</button>
              <a href={share.imageUrl} download="cpgis-jobs-map.png" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Download image</a>
            </div>
          </div>}

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
            <MapLegend mapTheme={mapTheme} showExpired={showExpired} />

            <div className="flex flex-wrap items-center gap-3">
              {!showExpired && expiredCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleShowExpired()}
                  disabled={expiredLoading}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-cpgis-globe hover:text-cpgis-deep"
                >
                  {expiredLoading ? "Loading past postings…" : `${expiredCount.toLocaleString()} expired postings hidden — show them`}
                </button>
              ) : null}
              {showExpired ? (
                <button
                  type="button"
                  onClick={() => setShowExpired(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-cpgis-globe hover:text-cpgis-deep"
                >
                  Hide expired postings
                </button>
              ) : null}
              {expiredError ? <p role="alert" className="text-sm text-rose-700">{expiredError}</p> : null}
            </div>
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

function MapLegend({
  mapTheme,
  showExpired,
}: {
  mapTheme: "light" | "dark";
  showExpired: boolean;
}) {
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
      {showExpired ? (
        <LegendItem color={palette.expired.fill} label="Expired" />
      ) : null}
      <span className={isDark ? "text-slate-400" : "text-slate-500"}>
        Hover over a point to preview title, institution, city, and deadline.
      </span>
    </div>
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
