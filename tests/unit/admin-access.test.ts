import { afterEach, describe, expect, it, vi } from "vitest";
import { canAccessAdmin } from "@/lib/auth";
import type { SessionContext } from "@/lib/types";

const publicSession: SessionContext = { mode: "supabase", role: "public", user: null };
const memberSession: SessionContext = { mode: "supabase", role: "member", user: { id: "member-1" } };
const adminSession: SessionContext = { mode: "supabase", role: "admin", user: { id: "admin-1" } };
const demoSession: SessionContext = { mode: "demo", role: "public", user: null };

afterEach(() => vi.unstubAllEnvs());

describe("admin access", () => {
  it("requires a signed-in admin role in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(canAccessAdmin(publicSession)).toBe(false);
    expect(canAccessAdmin(memberSession)).toBe(false);
    expect(canAccessAdmin({ ...adminSession, user: null })).toBe(false);
    expect(canAccessAdmin(adminSession)).toBe(true);
    expect(canAccessAdmin(demoSession)).toBe(false);
  });

  it("preserves the local demo workspace outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(canAccessAdmin(demoSession)).toBe(true);
  });
});
