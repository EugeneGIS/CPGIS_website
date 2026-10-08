import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Supabase server key configuration", () => {
  it("uses the modern secret key when present", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "modern-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-test-key");
    vi.resetModules();

    const { env } = await import("@/lib/env");
    expect(env.supabaseServiceRoleKey).toBe("modern-test-key");
  });

  it("retains support for the legacy service-role variable", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-test-key");
    vi.resetModules();

    const { env } = await import("@/lib/env");
    expect(env.supabaseServiceRoleKey).toBe("legacy-test-key");
  });
});
