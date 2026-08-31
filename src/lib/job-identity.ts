import { createHash } from "node:crypto";

const MAX_SLUG_LENGTH = 80;
const HASH_LENGTH = 16;
const READABLE_PREFIX_LENGTH = MAX_SLUG_LENGTH - HASH_LENGTH - 1;

export interface JobIdentityInput {
  organization: string;
  title: string;
  applicationUrl: string;
}

function normalizeText(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function readableSlug(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createJobIdentityHash(input: JobIdentityInput) {
  const identity = [
    "cpgis-job-v1",
    normalizeText(input.organization).toLowerCase(),
    normalizeText(input.title).toLowerCase(),
    normalizeText(input.applicationUrl),
  ].join("\n");

  return createHash("sha256").update(identity, "utf8").digest("hex");
}

/**
 * Build a stable public identifier from the source fields that identify a job.
 * The hash is computed before the human-readable prefix is truncated, so long
 * titles with the same prefix do not collapse onto the same URL.
 */
export function createJobSlug(input: JobIdentityInput) {
  const hash = createJobIdentityHash(input).slice(0, HASH_LENGTH);
  const prefix =
    readableSlug(`${input.organization}-${input.title}`).slice(0, READABLE_PREFIX_LENGTH) ||
    "job";

  return `${prefix}-${hash}`;
}

export function createJobId(input: JobIdentityInput) {
  return `job-${createJobIdentityHash(input).slice(0, 24)}`;
}

/** Reproduce the original public slug so existing database rows remain addressable. */
export function createLegacyJobSlug(input: Pick<JobIdentityInput, "organization" | "title">) {
  return readableSlug(`${input.organization}-${input.title}`).slice(0, MAX_SLUG_LENGTH);
}
