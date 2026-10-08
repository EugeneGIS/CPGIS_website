import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyOtp = vi.hoisted(() => vi.fn());
const exchangeCodeForSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));

import { GET } from "@/app/auth/confirm/route";

beforeEach(() => {
  verifyOtp.mockReset();
  exchangeCodeForSession.mockReset();
});

describe("auth email confirmation", () => {
  it("verifies invitations and opens password setup", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const response = await GET(new NextRequest("https://example.com/auth/confirm?token_hash=hash&type=invite"));

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type: "invite" });
    expect(response.headers.get("location")).toBe("https://example.com/set-password");
  });

  it("exchanges recovery codes and ignores external next URLs", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new NextRequest("https://example.com/auth/confirm?code=123&next=https://evil.example"));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("123");
    expect(response.headers.get("location")).toBe("https://example.com/submit");
  });

  it("sends invalid or expired links back to sign-in", async () => {
    verifyOtp.mockResolvedValue({ error: new Error("expired") });
    const response = await GET(new NextRequest("https://example.com/auth/confirm?token_hash=old&type=invite"));

    expect(response.headers.get("location")).toBe("https://example.com/sign-in?auth_error=invalid-link");
  });
});
