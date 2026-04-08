import Link from "next/link";
import { AdminJobsBoard } from "@/components/admin/admin-jobs-board";
import { DocxImportPanel } from "@/components/forms/docx-import-panel";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { getAdminJobs } from "@/lib/jobs";

export default async function AdminPage() {
  const session = await getSessionContext();

  const canManage = session.mode === "demo" || session.role === "admin";
  const jobs = canManage ? await getAdminJobs() : [];
  const pendingJobs = jobs.filter((job) => job.status === "pending").length;
  const publishedJobs = jobs.filter((job) => job.status === "published").length;
  const archivedJobs = jobs.filter((job) => job.status === "archived").length;

  return (
    <>
      <SiteHeader session={session} />
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#eef6f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Admin workspace
            </div>
            <h1 className="mt-3 text-4xl font-semibold">
              Review, bulk import, and publish records
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              This area is where ArcGIS Dashboard administration becomes an
              ordinary web back office. The sample build includes document parsing,
              status-based publishing, and a clear role split between public,
              member, and admin users.
            </p>
          </section>

          {!canManage ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="text-lg font-semibold">Admin access required</div>
              <p className="mt-2 text-sm leading-7">
                Your account is signed in as a member. Promote the user to
                `admin` in the `profiles` table to unlock publishing tools.
              </p>
              <Link href="/sign-in" className="mt-4 inline-block font-semibold text-cyan-700">
                Switch account
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AdminMetric label="Pending review" value={String(pendingJobs)} />
                <AdminMetric label="Published jobs" value={String(publishedJobs)} />
                <AdminMetric label="Archived jobs" value={String(archivedJobs)} />
                <AdminMetric
                  label="Mode"
                  value={session.mode === "demo" ? "Demo preview" : "Supabase live"}
                />
              </div>

              <AdminJobsBoard jobs={jobs} session={session} />
              <DocxImportPanel />
            </>
          )}
        </div>
      </main>
    </>
  );
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
