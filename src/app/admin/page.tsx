import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminJobsBoard } from "@/components/admin/admin-jobs-board";
import { DocxImportPanel } from "@/components/forms/docx-import-panel";
import { CsvImportPanel } from "@/components/forms/csv-import-panel";
import { createClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/site-header";
import { canAccessAdmin, getSessionContext } from "@/lib/auth";
import { getAdminJobs } from "@/lib/jobs";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { CpgisCsvCandidate } from "@/lib/cpgis-csv";
import { toDateKey } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSessionContext();

  if (!canAccessAdmin(session)) notFound();

  const jobs = await getAdminJobs();
  let csvRows: CpgisCsvCandidate[] = [];
  if (session.role === "admin" && isSupabaseConfigured() && env.supabaseServiceRoleKey) {
    const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
    const { data } = await client.from("cpgis_csv_imports")
      .select("extracted").eq("review_status", "pending")
      .order("posted_at", { ascending: false }).limit(30);
    csvRows = (data ?? []).map((item) => item.extracted as CpgisCsvCandidate);
  }
  const pendingJobs = jobs.filter((job) => job.status === "pending").length;
  const needsChangesJobs = jobs.filter((job) => job.status === "needs_changes").length;
  const approvedJobs = jobs.filter((job) => job.status === "approved").length;
  const publishedJobs = jobs.filter((job) => job.status === "published").length;
  const today = toDateKey(new Date());

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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <AdminMetric label="Pending review" value={String(pendingJobs)} />
                <AdminMetric label="Needs changes" value={String(needsChangesJobs)} />
                <AdminMetric label="Approved" value={String(approvedJobs)} />
                <AdminMetric label="Published jobs" value={String(publishedJobs)} />
                <AdminMetric
                  label="Mode"
                  value={session.mode === "demo" ? "Demo preview" : "Supabase live"}
                />
          </div>

          <AdminJobsBoard jobs={jobs} today={today} />
          {session.role === "admin" && isSupabaseConfigured() && env.supabaseServiceRoleKey
            ? <CsvImportPanel initialRows={csvRows} />
            : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Weekly CSV intake requires Supabase authentication, the service-role key, and the CSV import migration. The local demo cannot persist an import queue.</div>}
          <DocxImportPanel />
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
