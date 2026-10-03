/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapShareActions } from "@/components/map-share-actions";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { env } from "@/lib/env";
import { getDisplayJobTitle } from "@/lib/job-display";
import { getPublicAppOrigin } from "@/lib/job-share";
import { getMapShareView } from "@/lib/map-share-server";
import { mapPreviewPath } from "@/lib/map-preview-url";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function shareParams(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = shareParams(await searchParams);
  const view = await getMapShareView(params);
  if (!view) notFound();
  const suffix = params.toString();
  const origin = getPublicAppOrigin(env.appUrl);
  const url = `${origin}/map-share?${suffix}`;
  const imageUrl = `${origin}${mapPreviewPath(suffix)}`;
  const title = `CPGIS Jobs map | ${view.jobs.length} opportunities`;
  const description = `Explore ${view.jobs.length} job opportunities in a selected map area. Shared ${view.createdAt.slice(0, 10)}.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "CPGIS Jobs Portal", title, description, url, images: [{ url: imageUrl, width: 1200, height: 630, type: "image/png", alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default async function MapSharePage({ searchParams }: Props) {
  const params = shareParams(await searchParams);
  const [view, session] = await Promise.all([getMapShareView(params), getSessionContext()]);
  if (!view) notFound();
  const suffix = params.toString();
  const origin = getPublicAppOrigin(env.appUrl);
  const url = `${origin}/map-share?${suffix}`;
  const imagePath = mapPreviewPath(suffix);
  const imageUrl = `${origin}${imagePath}`;

  return <>
    <SiteHeader session={session} />
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#edf4f8_100%)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cpgis-deep">Shared map area</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{view.jobs.length} opportunities</h1>
            <p className="mt-2 text-sm text-slate-600">Created {new Date(view.createdAt).toLocaleDateString("en-GB")}, {view.persisted ? "saved selection" : "live selection; matching jobs can change"}</p>
          </div>
          <Link href="/" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-cpgis-deep hover:bg-cpgis-ice">Back to live map</Link>
        </div>
        <img src={imagePath} alt={`Map showing ${view.jobs.length} opportunities in the selected area`} width="1200" height="630" className="w-full rounded-[28px] border border-slate-200 shadow-[0_24px_70px_rgba(15,23,42,0.1)]" />
        <MapShareActions url={url} imageUrl={imageUrl} />
        {view.input.query && <p className="text-sm text-slate-600">Search filter: <strong>{view.input.query}</strong></p>}
        <section aria-label="Jobs in shared area" className="grid gap-3 md:grid-cols-2">
          {view.jobs.map((job) => <Link key={job.id} href={`/jobs/${encodeURIComponent(job.slug)}`} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-cpgis-globe hover:shadow-lg">
            <h2 className="font-semibold text-slate-950">{getDisplayJobTitle(job.title)}</h2>
            <p className="mt-2 text-sm text-slate-600">{job.organization}, {job.location.label}</p>
            <p className="mt-2 text-xs text-slate-500">{job.applyBy ? `Apply by ${job.applyBy}` : job.deadlineText}</p>
          </Link>)}
          {view.jobs.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">No public opportunities match this area and filter.</p>}
        </section>
      </div>
    </main>
  </>;
}
