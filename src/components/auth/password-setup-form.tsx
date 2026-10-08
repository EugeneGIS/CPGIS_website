"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export function PasswordSetupForm() {
  const router = useRouter();
  const [ready, setReady] = useState(!isSupabaseConfigured());
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      return;
    }

    let active = true;
    async function checkSession() {
      const { data } = await supabase.auth.getUser();
      if (active) {
        setHasSession(Boolean(data.user));
        setReady(true);
      }
    }
    void checkSession();
    return () => { active = false; };
  }, []);

  function handleSubmit() {
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    const supabase = getBrowserSupabaseClient();
    if (!supabase || !hasSession) {
      setMessage("Your link is invalid or expired. Request a new password link.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message);
        return;
      }
      router.push("/submit");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Access</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">Set your password</h1>
      {!ready ? <p className="mt-4 text-sm text-slate-600">Checking your email link…</p> : !hasSession ? (
        <p className="mt-4 text-sm text-slate-600">
          This link is invalid or expired. <Link href="/sign-in" className="font-semibold text-cyan-700">Request a new password link</Link>.
        </p>
      ) : (
        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">New password</span>
            <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Confirm password</span>
            <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          {message ? <p className="text-sm text-red-700">{message}</p> : null}
          <button type="button" onClick={handleSubmit} disabled={isPending} className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {isPending ? "Saving…" : "Save password"}
          </button>
        </div>
      )}
    </div>
  );
}
