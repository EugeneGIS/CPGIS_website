"use client";

import { useState } from "react";
import { getSafeHttpUrl } from "@/lib/job-share";
import type { JobRecord } from "@/lib/types";

interface JobActionsProps {
  job: JobRecord;
  compact?: boolean;
}

async function copyShareUrl(url: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = url;
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

export function JobActions({ job, compact = false }: JobActionsProps) {
  const [shareStatus, setShareStatus] = useState("");
  const safeApplicationUrl = getSafeHttpUrl(job.applicationUrl);

  async function handleShare() {
    const url = new URL(`/jobs/${job.slug}`, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: job.title,
          text: `${job.title} at ${job.organization}`,
          url,
        });
        setShareStatus("Shared");
      } else {
        await copyShareUrl(url);
        setShareStatus("Link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await copyShareUrl(url);
        setShareStatus("Link copied");
      } catch {
        setShareStatus("Unable to copy link");
      }
    }

    window.setTimeout(() => setShareStatus(""), 2200);
  }

  const sizing = compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        className={`rounded-full border border-slate-300 font-semibold text-slate-700 transition hover:border-cpgis-globe hover:text-cpgis-deep ${sizing}`}
      >
        Share
      </button>
      {safeApplicationUrl ? (
        <a
          href={safeApplicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-full border border-cpgis-globe/30 bg-cpgis-ice font-semibold text-cpgis-ink transition hover:bg-white ${sizing}`}
        >
          Apply now
        </a>
      ) : null}
      <span className="text-xs text-slate-500" aria-live="polite">
        {shareStatus}
      </span>
    </div>
  );
}
