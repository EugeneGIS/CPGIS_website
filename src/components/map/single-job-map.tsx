"use client";

import dynamic from "next/dynamic";
import type { JobLocation } from "@/lib/types";

const SingleJobMapInner = dynamic(() => import("./single-job-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center bg-slate-100 text-sm text-slate-500 sm:h-[380px]">
      Loading location map…
    </div>
  ),
});

export function SingleJobMap({
  location,
  organization,
}: {
  location: JobLocation;
  organization: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-[0_20px_55px_rgba(15,23,42,0.08)]"
      aria-labelledby="job-location-map-heading"
    >
      <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <h2
          id="job-location-map-heading"
          className="text-sm font-semibold text-slate-950"
        >
          Job location
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {organization} · {location.label}
        </p>
      </div>
      <div
        role="region"
        aria-label={`Map showing the job location at ${location.label}`}
      >
        <SingleJobMapInner location={location} organization={organization} />
      </div>
    </section>
  );
}
