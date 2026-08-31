import type { JobRecord, JobStatus, ReviewNote } from "@/lib/types";

/**
 * Dev-only in-memory submission store. It lets the full review workflow run
 * end to end without Supabase: submitted records appear as pending in the
 * admin board, can be moderated, and published ones show on the public map.
 * Everything is lost when the dev server restarts — production always uses
 * the real database.
 */

interface DemoStore {
  jobs: Map<string, JobRecord>;
  notes: Map<string, ReviewNote[]>;
}

// Route handlers and server components get separate module instances in the
// dev server, so the store must live on globalThis to be shared.
const globalStore = globalThis as typeof globalThis & {
  __cpgisDemoStore?: DemoStore;
};

const store: DemoStore = (globalStore.__cpgisDemoStore ??= {
  jobs: new Map<string, JobRecord>(),
  notes: new Map<string, ReviewNote[]>(),
});

const jobs = store.jobs;
const notes = store.notes;

export function addDemoJob(job: JobRecord) {
  jobs.set(job.id, job);
}

export function getDemoJobs(): JobRecord[] {
  return [...jobs.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function getPublishedDemoJobs(): JobRecord[] {
  return getDemoJobs().filter((job) => job.status === "published");
}

export function findDemoJobBySlug(slug: string): JobRecord | null {
  return getDemoJobs().find((job) => job.slug === slug) ?? null;
}

export function findDemoJobById(id: string): JobRecord | null {
  return jobs.get(id) ?? null;
}

export function updateDemoJobStatus(id: string, status: JobStatus) {
  const job = jobs.get(id);

  if (!job) {
    return null;
  }

  const updated: JobRecord = {
    ...job,
    status,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, updated);

  return updated;
}

export function setDemoSocialFlag(
  id: string,
  channel: "facebook" | "x",
  value: string | null,
) {
  const job = jobs.get(id);

  if (!job) {
    return null;
  }

  const updated: JobRecord = {
    ...job,
    ...(channel === "facebook"
      ? { facebookPostedAt: value ?? undefined }
      : { xPostedAt: value ?? undefined }),
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, updated);

  return updated;
}

export function getDemoNotes(jobId: string): ReviewNote[] {
  return notes.get(jobId) ?? [];
}

export function addDemoNote(jobId: string, body: string, authorEmail?: string) {
  const note: ReviewNote = {
    id: `note-${jobId}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    jobId,
    authorEmail,
    body,
    createdAt: new Date().toISOString(),
  };

  notes.set(jobId, [...(notes.get(jobId) ?? []), note]);

  return note;
}
