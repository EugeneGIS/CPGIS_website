import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JobDetailActions } from "@/components/job-detail-actions";
import { SingleJobMap } from "@/components/map/single-job-map";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { env } from "@/lib/env";
import { getJobPageData } from "@/lib/job-page-data";
import {
  buildCanonicalJobUrl,
  getJobShareDescription,
  getJobShareTitle,
} from "@/lib/job-share";
import { formatDateLabel, formatRelativeDeadline, formatSourceDate } from "@/lib/utils";

type JobPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobPageData(slug);

  if (!job) {
    notFound();
  }

  const canonicalUrl = buildCanonicalJobUrl(job.slug, env.appUrl);
  const title = getJobShareTitle(job);
  const description = getJobShareDescription(job);

  return {
    metadataBase: new URL(new URL(canonicalUrl).origin),
    title: `${title} | CPGIS Jobs`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonicalUrl,
      siteName: "CPGIS Jobs Portal",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function JobDetailPage({
  params,
}: JobPageProps) {
  const { slug } = await params;
  const [session, job] = await Promise.all([
    getSessionContext(),
    getJobPageData(slug),
  ]);

  if (!job) {
    notFound();
  }

  if (job.slug !== slug) {
    permanentRedirect(`/jobs/${job.slug}`);
  }

  const canonicalUrl = buildCanonicalJobUrl(job.slug, env.appUrl);

  return (
    <>
      <SiteHeader session={session} />
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#edf4f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <SingleJobMap location={job.location} organization={job.organization} />

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
              Public share page
            </div>
            <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight text-slate-950">
              {job.title}
            </h1>
            <p className="mt-3 text-lg text-slate-600">{job.organization}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Info label="Location" value={job.location.label} />
              <Info label="Deadline" value={formatDateLabel(job.applyBy)} />
              <Info label="Time left" value={formatRelativeDeadline(job.applyBy)} />
              <Info
                label="Source date"
                value={job.sourceDate ? formatSourceDate(job.sourceDate) : "Unknown"}
              />
            </div>

            <p className="mt-6 text-base leading-8 text-slate-700">{job.summary}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-cpgis-ice px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cpgis-deep"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <JobDetailActions
                applicationUrl={job.applicationUrl}
                canonicalUrl={canonicalUrl}
                organization={job.organization}
                title={job.title}
              />
              <Link
                href="/"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-cpgis-globe hover:text-cpgis-deep"
              >
                Back to map
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
