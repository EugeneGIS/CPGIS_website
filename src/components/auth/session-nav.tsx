"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionContext } from "@/lib/types";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export function SessionNav({ session }: { session: SessionContext }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!session.user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-cpgis-globe hover:text-cpgis-globe"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-cpgis-globe md:block">
        {session.role}
      </div>
      <div className="hidden text-sm text-slate-300 md:block">
        {session.profileName ?? session.user.email}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-cpgis-globe hover:text-cpgis-globe"
      >
        Sign out
      </button>
    </div>
  );
}
