import { JobsPortal } from "@/components/jobs-portal";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { getPublishedJobs } from "@/lib/jobs";
import { toDateKey } from "@/lib/utils";

// Live data on every request: production reads Supabase (dynamic anyway) and
// the demo in-memory queue must be visible right after publishing.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [jobs, session] = await Promise.all([
    getPublishedJobs(),
    getSessionContext(),
  ]);

  return (
    <>
      <SiteHeader session={session} />
      <JobsPortal jobs={jobs} today={toDateKey(new Date())} />
    </>
  );
}
