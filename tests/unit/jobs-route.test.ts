import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => false,
}));

import { POST } from "@/app/api/jobs/route";

const validSubmission = {
  title: "Postdoctoral Research Fellow",
  organization: "Example University",
  summary: "A sufficiently detailed summary of this research opportunity.",
  applicationUrl: "https://example.org/jobs/42",
  city: "Zurich",
  country: "Switzerland",
  latitude: 47.3769,
  longitude: 8.5417,
  tags: ["GIS"],
};

describe("POST /api/jobs date validation", () => {
  it("returns a structured 400 response for an impossible apply-by date", async () => {
    const response = await POST(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...validSubmission, applyBy: "2026-02-30" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "VALIDATION_FAILED",
      issues: [
        {
          path: "applyBy",
          message: "Apply-by date must be empty or a real date in YYYY-MM-DD format.",
        },
      ],
    });
  });
});
