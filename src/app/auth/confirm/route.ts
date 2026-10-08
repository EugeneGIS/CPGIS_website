import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const supabase = await createServerSupabaseClient();

  if (tokenHash && (type === "invite" || type === "recovery" || type === "signup" || type === "email")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    if (!error) {
      const destination = type === "invite" || type === "recovery" ? "/set-password" : "/submit";
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = url.searchParams.get("next") === "/set-password" ? "/set-password" : "/submit";
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/sign-in?auth_error=invalid-link", url.origin));
}
