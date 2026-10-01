import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ supabaseConfigured: false, demoEnabled: false }));
const getSessionContext = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => state.supabaseConfigured,
  isDemoImportPreviewEnabled: () => state.demoEnabled,
}));
vi.mock("@/lib/auth", () => ({ getSessionContext }));

import { PATCH } from "@/app/api/admin/jobs/[id]/route";
import { GET, POST } from "@/app/api/admin/jobs/[id]/notes/route";

const context = { params: Promise.resolve({ id: "job-1" }) };

beforeEach(() => {
  state.supabaseConfigured = false;
  state.demoEnabled = false;
  getSessionContext.mockReset();
});

describe("admin API access", () => {
  it("does not expose demo moderation or notes in production", async () => {
    const moderation = await PATCH(new Request("http://localhost/api/admin/jobs/job-1", {
      method: "PATCH", body: JSON.stringify({ status: "published" }),
    }), context);
    const notes = await GET(new Request("http://localhost/api/admin/jobs/job-1/notes"), context);
    const writeNote = await POST(new Request("http://localhost/api/admin/jobs/job-1/notes", {
      method: "POST", body: JSON.stringify({ body: "Private review" }),
    }), context);
    expect([moderation.status, notes.status, writeNote.status]).toEqual([503, 503, 503]);
  });

  it("rejects a signed-in member before moderation or note writes", async () => {
    state.supabaseConfigured = true;
    getSessionContext.mockResolvedValue({ mode: "supabase", role: "member", user: { id: "member-1" } });
    const moderation = await PATCH(new Request("http://localhost/api/admin/jobs/job-1", {
      method: "PATCH", body: JSON.stringify({ status: "published" }),
    }), context);
    const writeNote = await POST(new Request("http://localhost/api/admin/jobs/job-1/notes", {
      method: "POST", body: JSON.stringify({ body: "Private review" }),
    }), context);
    expect(moderation.status).toBe(403);
    expect(writeNote.status).toBe(403);
  });
});
