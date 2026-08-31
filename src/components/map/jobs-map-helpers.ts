import type { JobRecord } from "@/lib/types";

export { buildCanonicalJobUrl } from "@/lib/job-share";
export { getSafeHttpUrl as getSafeApplicationUrl } from "@/lib/job-share";

export type MapTheme = "light" | "dark";
export type DeadlineStatus = "active" | "closingSoon" | "expired";

// Keep Leaflet vector overlays synchronized with horizontally repeated
// basemap worlds after users pan across the antimeridian.
export const WORLD_COPY_JUMP_ENABLED = true;

export interface DisplayJob extends JobRecord {
  displayLatitude: number;
  displayLongitude: number;
  overlapCount: number;
  overlapIndex: number;
}

interface MarkerColors {
  fill: string;
  selectedFill: string;
  stroke: string;
  selectedStroke: string;
}

export const MARKER_PALETTE: Record<
  MapTheme,
  Record<DeadlineStatus, MarkerColors>
> = {
  light: {
    active: {
      fill: "#3753a1",
      selectedFill: "#dbeafe",
      stroke: "#ffffff",
      selectedStroke: "#3753a1",
    },
    closingSoon: {
      fill: "#b42318",
      selectedFill: "#fee2e2",
      stroke: "#ffffff",
      selectedStroke: "#8f1d2c",
    },
    expired: {
      fill: "#cbd5e1",
      selectedFill: "#f1f5f9",
      stroke: "#ffffff",
      selectedStroke: "#64748b",
    },
  },
  dark: {
    active: {
      fill: "#67e8f9",
      selectedFill: "#ecfeff",
      stroke: "#164e63",
      selectedStroke: "#22d3ee",
    },
    closingSoon: {
      fill: "#fb7185",
      selectedFill: "#fff1f2",
      stroke: "#881337",
      selectedStroke: "#f43f5e",
    },
    expired: {
      fill: "#64748b",
      selectedFill: "#e2e8f0",
      stroke: "#1e293b",
      selectedStroke: "#94a3b8",
    },
  },
};

function coordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
}

export function getDeadlineStatus(
  applyBy: string | undefined,
  now = new Date(),
): DeadlineStatus {
  if (!applyBy) {
    return "active";
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${applyBy}T00:00:00`);
  const daysLeft = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft < 0) {
    return "expired";
  }

  return daysLeft <= 7 ? "closingSoon" : "active";
}

export function getDeadlineLabel(status: DeadlineStatus) {
  if (status === "expired") {
    return "Expired";
  }

  return status === "closingSoon" ? "Closing soon" : "Active";
}

export function spreadOverlappingJobs(jobs: JobRecord[]): DisplayJob[] {
  const groups = new Map<string, JobRecord[]>();

  for (const job of jobs) {
    // Unmappable records (failed geocode) must not pile up at (0, 0); they stay
    // in the list views but are skipped by the map.
    if (job.location.latitude === 0 && job.location.longitude === 0) {
      continue;
    }

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

export function shouldFocusSelection(
  previousJobId: string | undefined,
  nextJobId: string | undefined,
) {
  return Boolean(nextJobId && previousJobId !== nextJobId);
}
