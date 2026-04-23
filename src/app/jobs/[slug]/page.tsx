import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { getJobBySlug } from "@/lib/jobs";
import { formatDateLabel, formatRelativeDeadline, formatSourceDate } from "@/lib/utils";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, job] = await Promise.all([getSessionContext(), getJobBySlug(slug)]);

  if (!job) {
    notFound();
  }

  return (
    <>
      <SiteHeader session={session} />
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#edf4f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
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
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-cpgis-globe/30 bg-cpgis-ice px-5 py-3 text-sm font-semibold text-cpgis-ink transition hover:bg-white"
              >
                Open application
              </a>
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
