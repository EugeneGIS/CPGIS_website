"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export function AuthForm({ initialMessage = "" }: { initialMessage?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setMessage("");

    if (!email.trim() || (mode !== "reset" && !password)) {
      setMessage(mode === "reset" ? "Enter your email address." : "Enter your email and password.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setMessage(
        "Demo mode is active. Add Supabase keys to enable real authentication.",
      );
      return;
    }

    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      setMessage("Supabase client is unavailable.");
      return;
    }

    startTransition(async () => {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/set-password`,
        });

        setMessage(error
          ? error.message
          : "If this email has an account, a password setup link is on its way. Check your inbox and spam folder.");
        return;
      }

      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage(
          "Account created. Check your email if confirmation is enabled, then sign in.",
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Access
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Sign in or create an account
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Members can submit new opportunities. Admins can review, publish, and
          manage records. Public visitors can browse without logging in.
        </p>
      </div>

      <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode("sign-in")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "sign-in"
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("sign-up")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "sign-up"
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Create account
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {mode === "sign-up" ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
              placeholder="Your name"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
            placeholder="you@example.com"
            type="email"
          />
        </label>

        {mode !== "reset" ? <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
            placeholder="At least 8 characters"
            type="password"
          />
        </label> : null}
      </div>

      {mode === "sign-in" ? (
        <button
          type="button"
          onClick={() => { setMode("reset"); setMessage(""); }}
          className="mt-4 text-sm font-semibold text-cyan-700 hover:text-cyan-900"
        >
          Invited or forgot your password? Set a password by email
        </button>
      ) : mode === "reset" ? (
        <p className="mt-4 text-sm text-slate-600">
          Already have a password?{" "}
          <button type="button" onClick={() => { setMode("sign-in"); setMessage(""); }} className="font-semibold text-cyan-700 hover:text-cyan-900">
            Back to sign in
          </button>
        </p>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-wait disabled:bg-slate-700"
        >
          {isPending
            ? "Working…"
            : mode === "sign-in"
              ? "Sign in"
              : mode === "sign-up"
                ? "Create account"
                : "Email me a password link"}
        </button>
        <Link
          href="/"
          className="self-center text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
        >
          Back to public map
        </Link>
      </div>
    </div>
  );
}
