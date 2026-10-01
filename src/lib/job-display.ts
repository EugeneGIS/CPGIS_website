import type { JobRecord } from "@/lib/types";

export function getDisplayJobTitle(title: string) {
  return title
    .replace(/\bpositions?\s+(?=in\b|at\b|on\b|for\b)/gi, "")
    .replace(/\s+position$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getResearchDirection(job: JobRecord) {
  const match = job.title.match(/\bpositions?\s+(?:in|on|for)\s+(.+)$/i);
  if (match) return match[1].trim();
  return job.tags.filter((tag) => tag.length > 2).slice(0, 2).join(" · ");
}

export function getInstitutionParts(job: JobRecord) {
  const segments = job.organization.split(/,\s*/).map((part) => part.trim());
  const secondary = job.department?.trim() || (segments.length > 1 ? segments[0] : "");
  const primary = job.department ? job.organization : segments.slice(1).join(", ") || job.organization;
  return {
    secondary: secondary.replace(/^the\s+/i, ""),
    primary,
  };
}

export function getDisplayLocation(job: JobRecord) {
  const { city, country } = job.location;
  if (!country || city.trim().toLowerCase() === country.trim().toLowerCase()) {
    return city;
  }
  return [city, country].filter(Boolean).join(", ");
}
