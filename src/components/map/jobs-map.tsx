"use client";

import { useEffect, useRef } from "react";
import type { LatLngExpression } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { AddressCandidate, JobRecord, MapBounds } from "@/lib/types";

interface DisplayJob extends JobRecord {
  displayLatitude: number;
  displayLongitude: number;
  overlapCount: number;
  overlapIndex: number;
}

interface JobsMapProps {
  jobs: JobRecord[];
  selectedJobId?: string;
  focusCandidate: AddressCandidate | null;
  focusRequestId: number;
  mapTheme: "light" | "dark";
  onSelect: (jobId: string) => void;
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

function coordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
}

function spreadOverlappingJobs(jobs: JobRecord[]): DisplayJob[] {
  const groups = new Map<string, JobRecord[]>();

  for (const job of jobs) {
    const key = coordinateKey(job.location.latitude, job.location.longitude);
    const group = groups.get(key);

    if (group) {
      group.push(job);
    } else {
      groups.set(key, [job]);
    }
  }

  const spreadJobs: DisplayJob[] = [];

  for (const group of groups.values()) {
    const sortedGroup = [...group].sort((left, right) =>
      left.slug.localeCompare(right.slug),
    );

    if (sortedGroup.length === 1) {
      const job = sortedGroup[0];
      spreadJobs.push({
        ...job,
        displayLatitude: job.location.latitude,
        displayLongitude: job.location.longitude,
        overlapCount: 1,
        overlapIndex: 0,
      });
      continue;
    }

    const baseLatitude = sortedGroup[0].location.latitude;
    const latitudeFactor = 111320;
    const longitudeFactor =
      Math.max(Math.cos((baseLatitude * Math.PI) / 180), 0.2) * 111320;

    sortedGroup.forEach((job, index) => {
      const angle = (2 * Math.PI * index) / sortedGroup.length;
      const ring = Math.floor(index / 8) + 1;
      const radiusMeters = 240 + (ring - 1) * 120;
      const latitudeOffset = (Math.sin(angle) * radiusMeters) / latitudeFactor;
      const longitudeOffset = (Math.cos(angle) * radiusMeters) / longitudeFactor;

      spreadJobs.push({
        ...job,
        displayLatitude: job.location.latitude + latitudeOffset,
        displayLongitude: job.location.longitude + longitudeOffset,
        overlapCount: sortedGroup.length,
        overlapIndex: index,
      });
    });
  }

  return spreadJobs;
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

  useEffect(() => {
    if (focusCandidate) {
      lastAddressFocusAtRef.current = Date.now();
      map.flyTo([focusCandidate.latitude, focusCandidate.longitude], 8, {
        duration: 1.1,
      });
    }
  }, [focusCandidate, focusRequestId, map]);

  useEffect(() => {
    if (selectedJob) {
      const msSinceAddressFocus = Date.now() - lastAddressFocusAtRef.current;
      if (msSinceAddressFocus < 1500) {
        return;
      }

      map.flyTo(
        [selectedJob.displayLatitude, selectedJob.displayLongitude],
        Math.max(map.getZoom(), 5),
        { duration: 1.1 },
      );
    }
  }, [selectedJob, map]);

  return null;
}

export default function JobsMap({
  jobs,
  selectedJobId,
  focusCandidate,
  focusRequestId,
  mapTheme,
  onSelect,
  onBoundsChange,
}: JobsMapProps) {
  const displayJobs = spreadOverlappingJobs(jobs);
  const selectedJob =
    displayJobs.find((job) => job.id === selectedJobId) ?? displayJobs[0] ?? null;
  const themeConfig =
    mapTheme === "dark"
      ? {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; CARTO',
          url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        }
      : {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        };

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <MapContainer
        center={averageCenter(jobs)}
        zoom={3}
        minZoom={2}
        scrollWheelZoom
        className="h-[500px] w-full"
      >
        <TileLayer attribution={themeConfig.attribution} url={themeConfig.url} />

        <BoundsBridge onBoundsChange={onBoundsChange} />
        <FocusBridge
          selectedJob={selectedJob}
          focusCandidate={focusCandidate}
          focusRequestId={focusRequestId}
        />

        {displayJobs.map((job) => {
          const selected = job.id === selectedJobId;

          return (
            <CircleMarker
              key={job.id}
              center={[job.displayLatitude, job.displayLongitude]}
              radius={selected ? 11 : 7}
              pathOptions={{
                color: selected ? "#7dd3fc" : "#38bdf8",
                fillColor: selected ? "#cffafe" : "#06b6d4",
                fillOpacity: selected ? 0.95 : 0.75,
                weight: selected ? 3 : 1.5,
              }}
              eventHandlers={{
                click: () => onSelect(job.id),
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{job.title}</div>
                  <div>{job.organization}</div>
                  <div>{job.location.label}</div>
                  {job.overlapCount > 1 ? (
                    <div className="text-xs text-slate-600">
                      Expanded from {job.overlapCount} overlapping jobs at this source
                      location.
                    </div>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
