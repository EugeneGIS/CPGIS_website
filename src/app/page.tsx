import { JobsPortal } from "@/components/jobs-portal";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { getActivePublishedJobs, getPublishedJobCount } from "@/lib/jobs";
import { toDateKey } from "@/lib/utils";

// Live data on every request: production reads Supabase (dynamic anyway) and
// the demo in-memory queue must be visible right after publishing.
export const dynamic = "force-dynamic";

export default async function Home() {
  const today = toDateKey(new Date());
  const [jobs, publishedCount, session] = await Promise.all([
    getActivePublishedJobs(today),
    getPublishedJobCount(),
    getSessionContext(),
  ]);

  return (
    <>
      <SiteHeader session={session} />
      <JobsPortal jobs={jobs} expiredCount={Math.max(0, publishedCount - jobs.length)} />
    </>
  );
}
