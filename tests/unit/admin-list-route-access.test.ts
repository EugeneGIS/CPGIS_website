import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionContext = vi.hoisted(() => vi.fn());
const getAdminJobPage = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  getSessionContext,
  canAccessAdmin: (session: { role: string; mode: string; user: unknown }) =>
    session.role === "admin" && Boolean(session.user),
}));
vi.mock("@/lib/jobs", () => ({ getAdminJobPage }));

import { GET } from "@/app/api/admin/jobs/route";

beforeEach(() => {
  getSessionContext.mockReset();
  getAdminJobPage.mockReset();
});

describe("admin list API", () => {
  it("rejects a regular member before reading review data", async () => {
    getSessionContext.mockResolvedValue({ mode: "supabase", role: "member", user: { id: "member-1" } });
    const response = await GET(new Request("http://localhost/api/admin/jobs?status=all"));
    expect(response.status).toBe(403);
    expect(getAdminJobPage).not.toHaveBeenCalled();
  });

  it("validates filters and returns the selected page to an admin", async () => {
    getSessionContext.mockResolvedValue({ mode: "supabase", role: "admin", user: { id: "admin-1" } });
    const invalid = await GET(new Request("http://localhost/api/admin/jobs?status=wrong"));
    expect(invalid.status).toBe(400);
    getAdminJobPage.mockResolvedValue({ jobs: [], total: 0, duplicateCounts: {} });
    const response = await GET(new Request("http://localhost/api/admin/jobs?status=pending&query=Zurich&page=1"));
    expect(response.status).toBe(200);
    expect(getAdminJobPage).toHaveBeenCalledWith(expect.objectContaining({ status: "pending", query: "Zurich", page: 1 }));
  });
});
