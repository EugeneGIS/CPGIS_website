import type { SessionContext } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getSessionContext(): Promise<SessionContext> {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo",
      role: "public",
      user: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      mode: "supabase",
      role: "public",
      user: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    mode: "supabase",
    role: profile?.role === "admin" ? "admin" : "member",
    user: {
      id: user.id,
      email: user.email,
    },
    profileName: profile?.full_name ?? user.email ?? "Signed-in user",
  };
}
