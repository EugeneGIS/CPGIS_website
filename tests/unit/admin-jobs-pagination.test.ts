import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { getAdminJobCounts, getAdminJobPage, getAdminJobs } from "@/lib/jobs";

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

  it("fetches only one filtered review page and checks its links for duplicates", async () => {
    const selected = row(26);
    selected.status = "pending";
    const pageRange = vi.fn(async () => ({ data: [selected], count: 26, error: null }));
    const matchRange = vi.fn(async () => ({
      data: [{ application_url: selected.application_url }, { application_url: selected.application_url }],
      error: null,
    }));
    const filters = {
      eq: vi.fn(), or: vi.fn(), order: vi.fn(), range: pageRange,
    };
    filters.eq.mockReturnValue(filters);
    filters.or.mockReturnValue(filters);
    filters.order.mockReturnValue(filters);
    const select = vi.fn((columns: string) => columns === "*"
      ? filters
      : { in: vi.fn(() => ({ order: () => ({ range: matchRange }) })) });
    createServerSupabaseClient.mockResolvedValue({ from: () => ({ select }) });

    const result = await getAdminJobPage({ status: "pending", query: "Zurich", page: 1, today: "2026-10-02" });
    expect(result.jobs.map((job) => job.id)).toEqual(["job-26"]);
    expect(result.total).toBe(26);
    expect(result.duplicateCounts[selected.application_url]).toBe(2);
    expect(filters.eq).toHaveBeenCalledWith("status", "pending");
    expect(filters.or).toHaveBeenCalledWith(expect.stringContaining("city.ilike.%Zurich%"));
    expect(pageRange).toHaveBeenCalledWith(25, 49);
  });

  it("counts statuses without hydrating every review card", async () => {
    const values: Record<string, number> = {
      pending: 2, needs_changes: 1, approved: 1, draft: 0, published: 10, archived: 3,
    };
    const eq = vi.fn(async (_column: string, status: string) => ({ count: values[status], error: null }));
    createServerSupabaseClient.mockResolvedValue({
      from: () => ({ select: () => ({ eq }) }),
    });

    const counts = await getAdminJobCounts();
    expect(counts.all).toBe(17);
    expect(counts.pending).toBe(2);
    expect(eq).toHaveBeenCalledTimes(6);
  });
});
