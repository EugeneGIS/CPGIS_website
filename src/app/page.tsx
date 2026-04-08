import { JobsPortal } from "@/components/jobs-portal";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { getPublishedJobs } from "@/lib/jobs";

export default async function Home() {
  const [jobs, session] = await Promise.all([
    getPublishedJobs(),
    getSessionContext(),
  ]);

  return (
    <>
      <SiteHeader session={session} />
      <JobsPortal jobs={jobs} />
    </>
  );
}
