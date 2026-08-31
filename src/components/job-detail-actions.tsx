"use client";

import { Check, ExternalLink, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSafeHttpUrl } from "@/lib/job-share";

interface JobDetailActionsProps {
  applicationUrl: string;
  canonicalUrl: string;
  organization: string;
  title: string;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();

  if (!copied) {
    throw new Error("Clipboard access is unavailable.");
  }
}

export function JobDetailActions({
  applicationUrl,
  canonicalUrl,
  organization,
  title,
}: JobDetailActionsProps) {
  const [shareStatus, setShareStatus] = useState<
    "idle" | "shared" | "copied" | "failed"
  >("idle");
  const resetTimerRef = useRef<number | null>(null);
  const safeApplicationUrl = getSafeHttpUrl(applicationUrl);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  function scheduleStatusReset() {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setShareStatus("idle"), 2400);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} — ${organization}`,
          text: `View this opportunity at ${organization}.`,
          url: canonicalUrl,
        });
        setShareStatus("shared");
        scheduleStatusReset();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await copyText(canonicalUrl);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
    scheduleStatusReset();
  }

  const shareLabel =
    shareStatus === "shared"
      ? "Shared"
      : shareStatus === "copied"
        ? "Link copied"
        : shareStatus === "failed"
          ? "Copy failed"
          : "Share";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-cpgis-globe hover:text-cpgis-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cpgis-globe"
        aria-live="polite"
      >
        {shareStatus === "shared" || shareStatus === "copied" ? (
          <Check aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Share2 aria-hidden="true" className="h-4 w-4" />
        )}
        {shareLabel}
      </button>

      {safeApplicationUrl ? (
        <a
          href={safeApplicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cpgis-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-cpgis-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cpgis-globe"
        >
          Apply now
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
}
