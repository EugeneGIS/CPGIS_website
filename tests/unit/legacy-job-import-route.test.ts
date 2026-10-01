import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ configured: false }));
const getSessionContext = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());
const select = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({ isSupabaseConfigured: () => state.configured }));
vi.mock("@/lib/auth", () => ({ getSessionContext }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { POST } from "@/app/api/admin/import-legacy/route";

function request(offset: number, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/import-legacy", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ offset }),
  });
}

beforeEach(() => {
  state.configured = false;
  getSessionContext.mockReset();
  createServerSupabaseClient.mockReset();
  upsert.mockReset();
  select.mockReset();
  select.mockResolvedValue({ data: [{ slug: "new-job" }], error: null });
  upsert.mockReturnValue({ select });
  createServerSupabaseClient.mockResolvedValue({ from: () => ({ upsert }) });
});

describe("admin legacy import route", () => {
  it("fails closed without Supabase", async () => {
    expect((await POST(request(0))).status).toBe(503);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects members and cross-origin requests", async () => {
    state.configured = true;
    getSessionContext.mockResolvedValue({ mode: "supabase", role: "member", user: { id: "member-1" } });
    expect((await POST(request(0))).status).toBe(403);
    getSessionContext.mockResolvedValue({ mode: "supabase", role: "admin", user: { id: "admin-1" } });
    expect((await POST(request(0, "https://other.example"))).status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("only accepts aligned offsets and imports without overwriting existing slugs", async () => {
    state.configured = true;
    getSessionContext.mockResolvedValue({ mode: "supabase", role: "admin", user: { id: "admin-1" } });
    expect((await POST(request(1))).status).toBe(400);

    const response = await POST(request(5100));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      total: 5147,
      processed: 47,
      inserted: 1,
      existing: 46,
      nextOffset: 5147,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ status: "published" })]),
      { onConflict: "slug", ignoreDuplicates: true },
    );
    expect(upsert.mock.calls[0][0]).toHaveLength(47);
  });
});
