import type { JobRecord } from "@/lib/types";

export const PUBLIC_APP_URL = "https://cpgis-job-portal.vercel.app";
const DEFAULT_APP_URL =
  process.env.NODE_ENV === "production" ? PUBLIC_APP_URL : "http://localhost:3000";

export function getSafeHttpOrigin(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin;
    }
  } catch {
    // Fall through to the safe local default.
  }

  return DEFAULT_APP_URL;
}

export function buildCanonicalJobUrl(slug: string, appUrl: string) {
  const path = `/jobs/${encodeURIComponent(slug)}`;
  return new URL(path, getSafeHttpOrigin(appUrl)).toString();
}

export function getPublicAppOrigin(configuredUrl?: string) {
  const origin = getSafeHttpOrigin(configuredUrl || PUBLIC_APP_URL);
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ? PUBLIC_APP_URL
    : origin;
}

export function buildPublicJobUrl(slug: string, configuredUrl?: string) {
  return buildCanonicalJobUrl(slug, getPublicAppOrigin(configuredUrl));
}

export function getSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function toShareSafeText(value: string, maxLength: number) {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getJobShareTitle(job: JobRecord) {
  return toShareSafeText(`${job.title} — ${job.organization}`, 100);
}

export function getJobShareDescription(job: JobRecord) {
  const location = job.location.label
    ? ` in ${job.location.label}`
    : "";
  return toShareSafeText(
    `${job.title} at ${job.organization}${location}. ${job.summary}`,
    180,
  );
}
