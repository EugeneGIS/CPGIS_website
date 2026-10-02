import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { getActivePublishedJobs, getPastDeadlineCount, getPublishedJobCount, getPublishedJobsByIds } from "@/lib/jobs";

function row(id: string, sourceDate: string, applyBy: string | null = null) {
  return {
    id, slug: id, title: `Job ${id}`, organization: "Example University",
    summary: "Example summary", application_url: `https://example.org/${id}`,
    status: "published", tags: [], created_at: `${sourceDate}T09:00:00Z`,
    updated_at: `${sourceDate}T09:00:00Z`, source_date: sourceDate,
    apply_by: applyBy, city: "Zurich", country: "Switzerland",
    latitude: 47.3769, longitude: 8.5417,
  };
}

beforeEach(() => createServerSupabaseClient.mockReset());

describe("focused public job queries", () => {
  it("queries a recent date window, then applies exact calendar-day expiry", async () => {
    const rows = [
      row("deadline-today", "2026-04-01", "2026-10-02"),
      row("rolling-active", "2026-08-02"),
      row("rolling-expired", "2026-08-01"),
    ];
    const range = vi.fn(async () => ({ data: rows, error: null }));
    const or = vi.fn(() => ({ order: () => ({ range }) }));
    createServerSupabaseClient.mockResolvedValue({
      from: () => ({ select: () => ({ eq: () => ({ or }) }) }),
    });

    const jobs = await getActivePublishedJobs("2026-10-02");
    expect(jobs.map((job) => job.id)).toEqual(["deadline-today", "rolling-active"]);
    expect(or).toHaveBeenCalledWith(expect.stringContaining("apply_by.gte.2026-10-02"));
    expect(range).toHaveBeenCalledWith(0, 999);
  });

  it("counts all published jobs without loading their rows", async () => {
    const eq = vi.fn(async () => ({ count: 5147, error: null }));
    const select = vi.fn(() => ({ eq }));
    createServerSupabaseClient.mockResolvedValue({ from: () => ({ select }) });

    expect(await getPublishedJobCount()).toBe(5147);
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  });

  it("counts historical deadline months without loading job descriptions", async () => {
    const lt = vi.fn(async () => ({ count: 4000, error: null }));
    createServerSupabaseClient.mockResolvedValue({
      from: () => ({ select: () => ({ eq: () => ({ lt }) }) }),
    });
    expect(await getPastDeadlineCount("2026-10")).toBe(4000);
    expect(lt).toHaveBeenCalledWith("apply_by", "2026-10-01");
  });

  it("loads only the IDs pinned in a saved share", async () => {
    const byId = vi.fn(async () => ({ data: [row("selected", "2026-10-01")], error: null }));
    createServerSupabaseClient.mockResolvedValue({
      from: () => ({ select: () => ({ eq: () => ({ in: byId }) }) }),
    });

    const jobs = await getPublishedJobsByIds(["selected"]);
    expect(jobs.map((job) => job.id)).toEqual(["selected"]);
    expect(byId).toHaveBeenCalledWith("id", ["selected"]);
  });
});
