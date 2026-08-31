"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { LatLngExpression } from "leaflet";
import { ExternalLink, Share2 } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { AddressCandidate, JobRecord, MapBounds } from "@/lib/types";
import { formatDateLabel, formatRelativeDeadline } from "@/lib/utils";
import { EnglishVectorLayer } from "./english-vector-layer";
import { SouthChinaSeaLayer } from "./south-china-sea-layer";
import {
  buildCanonicalJobUrl,
  getDeadlineLabel,
  getDeadlineStatus,
  getSafeApplicationUrl,
  MARKER_PALETTE,
  shouldFocusSelection,
  spreadOverlappingJobs,
  WORLD_COPY_JUMP_ENABLED,
  type DisplayJob,
} from "./jobs-map-helpers";

interface JobsMapProps {
  jobs: JobRecord[];
  selectedJobId?: string;
  focusCandidate: AddressCandidate | null;
  focusRequestId: number;
  mapTheme: "light" | "dark";
  onSelect: (jobId: string) => void;
  onClearSelection: () => void;
  onBoundsChange: (bounds: MapBounds) => void;
}

function averageCenter(jobs: JobRecord[]): LatLngExpression {
  if (!jobs.length) {
    return [40, 0];
  }

  const totals = jobs.reduce(
    (accumulator, job) => ({
      latitude: accumulator.latitude + job.location.latitude,
      longitude: accumulator.longitude + job.location.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return [
    totals.latitude / jobs.length,
    totals.longitude / jobs.length,
  ] satisfies LatLngExpression;
}

function BoundsBridge({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
    zoomend() {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
  });

  useEffect(() => {
    const bounds = map.getBounds();
    onBoundsChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }, [map, onBoundsChange]);

  return null;
}

function ClearSelectionBridge({ onClear }: { onClear: () => void }) {
  useMapEvents({
    click: onClear,
  });

  return null;
}

function FocusBridge({
  selectedJob,
  focusCandidate,
  focusRequestId,
}: {
  selectedJob: DisplayJob | null;
  focusCandidate: AddressCandidate | null;
  focusRequestId: number;
}) {
  const map = useMap();
  const lastAddressFocusAtRef = useRef(0);
  const previousSelectedJobIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (focusCandidate) {
      lastAddressFocusAtRef.current = Date.now();
      map.flyTo([focusCandidate.latitude, focusCandidate.longitude], 8, {
        duration: 1.1,
      });
    }
  }, [focusCandidate, focusRequestId, map]);

  useEffect(() => {
    const nextSelectedJobId = selectedJob?.id;
    const shouldFocus = shouldFocusSelection(
      previousSelectedJobIdRef.current,
      nextSelectedJobId,
    );
    previousSelectedJobIdRef.current = nextSelectedJobId;

    if (!selectedJob || !shouldFocus) {
      return;
    }

    const msSinceAddressFocus = Date.now() - lastAddressFocusAtRef.current;
    if (msSinceAddressFocus < 1500) {
      return;
    }

    map.flyTo(
      [selectedJob.displayLatitude, selectedJob.displayLongitude],
      Math.max(map.getZoom(), 5),
      { duration: 1.1 },
    );
  }, [selectedJob, map]);

  return null;
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");
  textArea.remove();

  if (!copied) {
    throw new Error("Could not copy the job link.");
  }
}

function JobPopupActions({ job }: { job: DisplayJob }) {
  const [shareStatus, setShareStatus] = useState<
    "idle" | "shared" | "copied" | "failed"
  >("idle");
  const applicationUrl = getSafeApplicationUrl(job.applicationUrl);

  async function handleShare() {
    const url = buildCanonicalJobUrl(job.slug, window.location.origin);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} — ${job.organization}`,
          text: `View this ${job.title} opportunity at ${job.organization}.`,
          url,
        });
        setShareStatus("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await copyToClipboard(url);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
  }

  const shareLabel =
    shareStatus === "shared"
      ? "Shared"
      : shareStatus === "copied"
        ? "Link copied"
        : shareStatus === "failed"
          ? "Copy failed"
          : "Share";

  return (
    <div className="cpgis-job-popup-actions">
      <button type="button" onClick={handleShare} aria-live="polite">
        <Share2 aria-hidden="true" size={14} />
        {shareLabel}
      </button>
      <a
        className="cpgis-job-popup-details"
        href={buildCanonicalJobUrl(job.slug, window.location.origin)}
      >
        View details
      </a>
      {applicationUrl ? (
        <a
          className="cpgis-job-popup-apply"
          href={applicationUrl}
          target="_blank"
          rel="noreferrer"
        >
          Apply now
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      ) : null}
    </div>
  );
}

export default function JobsMap({
  jobs,
  selectedJobId,
  focusCandidate,
  focusRequestId,
  mapTheme,
  onSelect,
  onClearSelection,
  onBoundsChange,
}: JobsMapProps) {
  const displayJobs = spreadOverlappingJobs(jobs);
  const selectedJob =
    displayJobs.find((job) => job.id === selectedJobId) ?? null;
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <MapContainer
        center={averageCenter(jobs)}
        zoom={3}
        minZoom={2}
        worldCopyJump={WORLD_COPY_JUMP_ENABLED}
        scrollWheelZoom
        className="h-[540px] w-full lg:h-[640px]"
      >
        <EnglishVectorLayer theme={mapTheme} />
        <SouthChinaSeaLayer theme={mapTheme} />

        <BoundsBridge onBoundsChange={onBoundsChange} />
        <ClearSelectionBridge onClear={onClearSelection} />
        <FocusBridge
          selectedJob={selectedJob}
          focusCandidate={focusCandidate}
          focusRequestId={focusRequestId}
        />

        {displayJobs.map((job) => {
          const selected = job.id === selectedJobId;
          const deadlineStatus = getDeadlineStatus(job.applyBy);
          const deadlineLabel = getDeadlineLabel(deadlineStatus);
          const colors = MARKER_PALETTE[mapTheme][deadlineStatus];

          return (
            <Fragment key={job.id}>
              <CircleMarker
                center={[job.displayLatitude, job.displayLongitude]}
                radius={selected ? 20 : 18}
                bubblingMouseEvents={false}
                className="cpgis-job-hit-target"
                pathOptions={{
                  color: "transparent",
                  fillColor: "#ffffff",
                  fillOpacity: 0.001,
                  opacity: 0,
                  weight: 0,
                }}
                eventHandlers={{
                  click: () => onSelect(job.id),
                }}
              >
                <Tooltip
                  className="cpgis-job-tooltip"
                  direction="top"
                  offset={[0, -8]}
                  opacity={1}
                  sticky
                >
                  <div className="cpgis-job-tooltip-content space-y-1">
                    <div
                      className="cpgis-job-tooltip-title text-sm font-semibold"
                      title={job.title}
                    >
                      {job.title}
                    </div>
                    <div
                      className="cpgis-job-tooltip-organization text-xs"
                      title={job.organization}
                    >
                      {job.organization}
                    </div>
                    <div className="text-xs text-slate-600">
                      {job.location.city}
                      {job.location.country ? `, ${job.location.country}` : ""}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      {deadlineLabel}: {formatDateLabel(job.applyBy)}
                    </div>
                  </div>
                </Tooltip>
                <Popup minWidth={240} maxWidth={320}>
                  <div className="cpgis-job-popup space-y-1">
                    <div
                      className="cpgis-job-popup-title font-semibold"
                      title={job.title}
                    >
                      {job.title}
                    </div>
                    <div
                      className="cpgis-job-popup-organization"
                      title={job.organization}
                    >
                      {job.organization}
                    </div>
                    <div>{job.location.label}</div>
                    <div>
                      {deadlineLabel}: {formatRelativeDeadline(job.applyBy)}
                    </div>
                    {job.overlapCount > 1 ? (
                      <div className="text-xs text-slate-600">
                        Expanded from {job.overlapCount} overlapping jobs at this
                        source location.
                      </div>
                    ) : null}
                    <JobPopupActions job={job} />
                  </div>
                </Popup>
              </CircleMarker>
              <CircleMarker
                center={[job.displayLatitude, job.displayLongitude]}
                radius={selected ? 11 : 7.5}
                interactive={false}
                pathOptions={{
                  color: selected ? colors.selectedStroke : colors.stroke,
                  fillColor: selected ? colors.selectedFill : colors.fill,
                  fillOpacity: selected ? 0.98 : 0.9,
                  opacity: 1,
                  weight: selected ? 3 : 1.75,
                }}
              />
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
