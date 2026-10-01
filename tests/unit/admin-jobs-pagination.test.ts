import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { getAdminJobs } from "@/lib/jobs";

function row(index: number) {
  return {
    id: `job-${index}`,
    slug: `job-${index}`,
    title: `Job ${index}`,
    organization: "Example University",
    summary: "Example summary",
    application_url: `https://example.org/jobs/${index}`,
    status: "published",
    tags: [],
    created_at: "2026-08-24T09:00:00.000Z",
    updated_at: "2026-08-24T09:00:00.000Z",
    city: "Zurich",
    country: "Switzerland",
    latitude: 47.3769,
    longitude: 8.5417,
  };
}

beforeEach(() => {
  createServerSupabaseClient.mockReset();
});

describe("admin job pagination", () => {
  it("loads records beyond Supabase's first 1000 rows", async () => {
    const rows = Array.from({ length: 1047 }, (_, index) => row(index));
    const range = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));
    createServerSupabaseClient.mockResolvedValue({
      from: () => ({ select: () => ({ order: () => ({ range }) }) }),
    });

    const jobs = await getAdminJobs();
    expect(jobs).toHaveLength(1047);
    expect(jobs.at(-1)?.id).toBe("job-1046");
    expect(range).toHaveBeenCalledTimes(2);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});
